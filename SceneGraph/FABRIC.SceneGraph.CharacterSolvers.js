
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//

/**
 * A character solver represents one computation in
 * the evaluation of a character's pose.
 */
FABRIC.SceneGraph.CharacterSolvers = {
  solvers: {},
  registerSolver: function(type, factoryFn) {
    if (this.solvers[type]) {
      throw ("CharacterSolver '" + type + "' already Registered");
    }else {
      this.solvers[type] = factoryFn;
    }
  },
  createSolver: function(type, options, scene) {
    if (!this.solvers[type]) {
      throw ("CharacterSolver '" + type + "' is not registered.");
    }
    var solver = this.solvers[type](options, scene);
    solver.name = options.name;
    solver.type = type;
    return solver;
  }
};

FABRIC.SceneGraph.CharacterSolvers.registerSolver('CharacterSolver',
  function(options, scene) {

    scene.assignDefaults(options, {
        color: FABRIC.RT.rgb(0, 0.8, 0, 1),
        highlightcolor: FABRIC.RT.rgb(0.8, 0.8, 0.8, 1),
        rigNode: undefined,
        createManipulators: true
      });


    if (!options.rigNode) {
      throw ('You must specify the rigNode.');
    }

    var parameterLayout;

    var boneIDs = {},
      manipulators = {};

    var solver = {
      getBoneIDs: function() {
        return boneIDs;
      },
      getBoneIndex: function(name) {
        return boneIDs[name];
      },
      constructManipulator: function(name, manipulatorType, options) {
        if (manipulators[name]) {
          throw (" Manipulator names must be unique. Solver '" + name + "' already contains :'" + name + "'");
        }
        options.name = name;
        manipulators[name] = scene.constructNode(manipulatorType, options);
        return manipulators[name];
      },
      getManipulators: function() {
        return manipulators;
      },
      getParameterBinding: function() {
        return parameterLayout;
      },
      setParameterBinding: function(binding) {
        parameterLayout = binding;
        return parameterLayout;
      }
    };

    /////////////////////////////////////////////////
    // Now define the mapping between the named bones,
    // and the bone ids.
    if (!options.bones) {
      throw ('We need to specify the bones dictionary for any CharacterSolver.');
    }
    if (!options.identifiers) {
      throw ('We need to specify the identifiers for any CharacterSolver.');
    }

    // create a temp map for boneName 2 id
    var name2id = {};
    var boneNames = options.rigNode.getSkeletonNode().getBoneNames();
    for (var i = 0; i < boneNames.length; i++) {
      name2id[boneNames[i]] = i;
    }
    // let's check the identifiers
    for (var i = 0; i < options.identifiers.length; i++)
    {

      if (options.identifiers[i].constructor.name === 'Array') {
        var name = options.identifiers[i][0];
        if (!options.bones[name]) {
          throw ("'" + name + "' were not specified.");
        }
        if (typeof(options.bones[name]) !== typeof(options.identifiers[i])) {
          throw ('Bone ' + name + ' was uncorrectly specified. Should be name array.');
        }
        var chainBones = [];
        var dynNames = options.bones[name];
        for (var j = 0; j < dynNames.length; j++) {
          if (name2id[dynNames[j]] == undefined) {
            throw ('Bone ' + dynNames[j] + ' is not part of the skeleton.');
          }
          chainBones.push(name2id[dynNames[j]]);
        }
        boneIDs[name] = chainBones;
      }else {
        var name = options.identifiers[i];
        if (!options.bones[name]) {
          throw ("'" + name + "' were not specified.");
        }
        if (name2id[options.bones[name]] == undefined) {
          throw ('Bone ' + options.bones[name] + ' is not part of the skeleton.');
        }
        boneIDs[name] = name2id[options.bones[name]];
      }
    }

    return solver;
  });

FABRIC.SceneGraph.CharacterSolvers.registerSolver('FKHierarchySolver',
  function(options, scene) {

    var solver,
      parameterLayout,
      bindToRig;

    options.bones = [];
    options.identifiers = [];

    solver = FABRIC.SceneGraph.CharacterSolvers.createSolver('CharacterSolver', options, scene);

    bindToRig = function() {

      var rigNode = options.rigNode,
        constantsNode = scene.getPrivateInterface(rigNode.getConstantsNode()),
        variablesNode = scene.getPrivateInterface(rigNode.getVariablesNode()),
        skeletonNode = rigNode.getSkeletonNode(),
        bones = skeletonNode.getBones(),
        referenceLocalPose = skeletonNode.getReferenceLocalPose(),
        boneIDs = solver.getBoneIDs(),
        size,
        name = options.name;

      // if no id list is specified,
      // create a complete one
      var boneIndices = options.boneIndices;
      if (!boneIndices) {
        boneIndices = [];
        for (var i = 0; i < bones.length; i++) {
          boneIndices.push(i);
        }
      }

      constantsNode.pub.addMember(name + 'boneIndices', 'Integer[]', boneIndices);

      if (options.localxfoMemberName == undefined) {
        var localXfos = [];
        for (var i = 0; i < boneIndices.length; i++) {
          localXfos.push(referenceLocalPose[boneIndices[i]]);
        }
        variablesNode.pub.addMember(name + 'localXfos', 'Xfo[]', localXfos);
        options.localxfoMemberName = name + 'localXfos';
      }
      
      solver.getLocalXfoMemberName = function() {
        return options.localxfoMemberName;
      }

      // insert at the previous to last position to ensure that we keep the last operator
      var opBindings = scene.getPrivateInterface(rigNode).getDGNode().bindings;
      opBindings.insert(scene.constructOperator({
          operatorName: 'solveFKHierarchy',
          srcFile: 'FABRIC_ROOT/SceneGraph/KL/solveFKHierarchy.kl',
          entryFunctionName: 'solveFKHierarchy',
          parameterLayout: solver.setParameterBinding([
            'self.pose',
            'skeleton.bones',
            'constants.' + name + 'boneIndices',
            'variables.' + options.localxfoMemberName
          ])
        }),
        opBindings.getLength() - 1);
    };

    bindToRig();

    return solver;
  });

FABRIC.SceneGraph.CharacterSolvers.registerSolver('ReferencePoseSolver',
  function(options, scene) {

    var solver,
      parameterLayout,
      bindToRig;

    options.bones = [];
    options.identifiers = [];

    solver = FABRIC.SceneGraph.CharacterSolvers.createSolver('CharacterSolver', options, scene);

    bindToRig = function() {

      var rigNode = options.rigNode,
        constantsNode = scene.getPrivateInterface(rigNode.getConstantsNode()),
        skeletonNode = rigNode.getSkeletonNode(),
        bones = skeletonNode.getBones(),
        name = options.name,
        boneIndices = options.boneIndices;

      // if no id list is specified,
      // create a complete one
      if (!boneIndices) {
        boneIndices = [];
        for (var i = 0; i < bones.length; i++) {
          boneIndices.push(i);
        }
      }

      constantsNode.pub.addMember(name + 'boneIndices', 'Integer[]', boneIndices);

      // insert at the previous to last position to ensure that we keep the last operator
      var opBindings = scene.getPrivateInterface(rigNode).getDGNode().bindings;
      opBindings.insert(scene.constructOperator({
          operatorName: 'solveReferencePose',
          srcFile: 'FABRIC_ROOT/SceneGraph/KL/solveReferencePose.kl',
          entryFunctionName: 'solveReferencePose',
          parameterLayout: solver.setParameterBinding([
            'self.pose',
            'skeleton.bones',
            'constants.' + name + 'boneIndices'
          ])
        }),
        opBindings.getLength() - 1);
    };

    bindToRig();

    return solver;
  });

// An FK Chain assumes a linear list of bones that can be
// connected together with a set of chained manipulators.
FABRIC.SceneGraph.CharacterSolvers.registerSolver('FKChainSolver',
  function(options, scene) {
    scene.assignDefaults(options, {
        color: FABRIC.RT.rgb(0, 0.6, 0),
        chainManipulators: true,
        twistManipulators: true,
        twistManipulatorRadius: undefined
      });

    var solver,
      parameterLayout,
      bindToRig;

    options.identifiers = [['bones']];

    solver = FABRIC.SceneGraph.CharacterSolvers.createSolver('CharacterSolver', options, scene);

    bindToRig = function() {

      var rigNode = scene.getPrivateInterface(options.rigNode),
        constantsNode = scene.getPrivateInterface(rigNode.pub.getConstantsNode()),
        variablesNode = scene.getPrivateInterface(rigNode.pub.getVariablesNode()),
        skeletonNode = rigNode.pub.getSkeletonNode(),
        bones = skeletonNode.getBones(),
        referenceLocalPose = skeletonNode.getReferenceLocalPose(),
        referencePose = skeletonNode.getReferencePose(),
        boneIDs = solver.getBoneIDs(),
        size,
        name = options.name,
        i,
        manipulators = [],
        chainLocalReferencePose = [],
        chainGlobalReferencePose = [];

      // check if the bones have a length
      for (i = 0; i < boneIDs.bones.length; i++) {
        if (bones[boneIDs.bones[i]].length <= 0.0) {
          throw ('Cannot apply FKChainSolver to bone ' +
            bones[boneIDs.bones[i]].name + ', because it has length == 0.');
        }
        if (i > 0 && bones[boneIDs.bones[i]].parent != boneIDs.bones[i - 1]) {
          throw ('Cannot apply FKChainSolver to bone ' +
            bones[boneIDs.bones[i]].name + ', because is not part of a single chain.');
        }
        chainLocalReferencePose.push(referenceLocalPose[boneIDs.bones[i]]);
        chainGlobalReferencePose.push(referencePose[boneIDs.bones[i]]);
      }


      constantsNode.pub.addMember(name + 'boneIndices', 'Integer[]', boneIDs.bones);
      variablesNode.pub.addMember(name + 'localXfos', 'Xfo[]', chainLocalReferencePose);
      // This member is used only to bind the manipulators to.
      rigNode.pub.addMember(name + 'globalXfos', 'Xfo[]', chainGlobalReferencePose);

      // insert at the previous to last position to ensure that we keep the last operator
      var opBindings = rigNode.getDGNode().bindings;
      opBindings.insert(scene.constructOperator({
          operatorName: 'solveChain',
          srcFile: 'FABRIC_ROOT/SceneGraph/KL/solveFKHierarchy.kl',
          entryFunctionName: 'solveChain',
          parameterLayout: solver.setParameterBinding([
            'self.pose',
            'self.' + name + 'globalXfos',
            'skeleton.bones',
            'constants.' + name + 'boneIndices',
            'variables.' + name + 'localXfos'
          ])
        }), opBindings.getLength() - 1);

      if (options.createManipulators) {
        for (i = 0; i < boneIDs.bones.length; i++) {
          manipulators.push(solver.constructManipulator(name + 'FKChainManipulator' + i, 'BoneManipulator', {
            targetNode: variablesNode.pub,
            targetMember: name + 'localXfos',
            targetMemberIndex: i,
            parentNode: rigNode.pub,
            parentMember: (i > 0 ? name + 'globalXfos' : 'pose'),
            parentMemberIndex: (i > 0 ? i - 1 : bones[boneIDs.bones[i]].parent),
            length: bones[boneIDs.bones[i]].length,
            color: FABRIC.RT.rgb(0, 0, 1)
          }));

          if (options.twistManipulators == true || options.twistManipulators[i] == true) {
            solver.constructManipulator(name + 'FKChainTwistManipulator' + i, 'RotationManipulator', {
              targetNode: variablesNode.pub,
              targetMember: name + 'localXfos',
              targetMemberIndex: i,
              parentNode: rigNode.pub,
              parentMember: (i > 0 ? name + 'globalXfos' : 'pose'),
              parentMemberIndex: (i > 0 ? i - 1 : bones[boneIDs.bones[i]].parent),
              localXfo: FABRIC.RT.xfo({
                ori: FABRIC.RT.Quat.makeFromAxisAndAngle(FABRIC.RT.vec3(0, 0, 1), -90)
              }),
              color: FABRIC.RT.rgb(0, .5, 0),
              radius: (options.twistManipulatorRadius ?
                options.twistManipulatorRadius : bones[boneIDs.bones[i]].length * 0.25)
            });
          }
        }
        if(options.chainManipulators){
          for (i = 0; i < manipulators.length; i++) {
            if(i>0){
              manipulators[i].setParentManipulatorNode( manipulators[i-1].pub );
            }
            if(i<manipulators.length-1){
              manipulators[i].setChildManipulatorNode( manipulators[i+1].pub );
            }
          }
        }
      }
    };

    bindToRig();

    return solver;
  });


FABRIC.SceneGraph.CharacterSolvers.registerSolver('RootBoneSolver',
  function(options, scene) {
    scene.assignDefaults(options, {
      manipulatorSize: 3
      });
    var solver,
      parameterLayout,
      bindToRig;

    options.identifiers = ['bone'];

    solver = FABRIC.SceneGraph.CharacterSolvers.createSolver('CharacterSolver', options, scene);

    bindToRig = function() {

      var rigNode = scene.getPrivateInterface(options.rigNode),
        constantsNode = scene.getPrivateInterface(rigNode.pub.getConstantsNode()),
        variablesNode = scene.getPrivateInterface(rigNode.pub.getVariablesNode()),
        skeletonNode = rigNode.pub.getSkeletonNode(),
        bones = skeletonNode.getBones(),
        referencePose = skeletonNode.getReferencePose(),
        boneIDs = solver.getBoneIDs(),
        size = options.manipulatorSize,
        name = options.name;

      constantsNode.pub.addMember(name + 'boneIndex', 'Integer', boneIDs.bone);
      variablesNode.pub.addMember(name + 'rootXfo', 'Xfo', referencePose[boneIDs.bone]);

      var opBindings = rigNode.getDGNode().bindings;
      opBindings.insert(scene.constructOperator({
          operatorName: 'solveFKBone',
          srcFile: 'FABRIC_ROOT/SceneGraph/KL/solveFKHierarchy.kl',
          entryFunctionName: 'solveFKBone',
          parameterLayout: solver.setParameterBinding([
            'self.pose',
            'skeleton.bones',
            'constants.' + name + 'boneIndex',
            'variables.' + name + 'rootXfo'
          ])
        }),
        opBindings.getLength() - 1);

      if (options.createManipulators) {

        solver.constructManipulator(name + 'Translation', 'ScreenTranslationManipulator', {
            parentNode: variablesNode.pub,
            parentMember: name + 'rootXfo',
            geometryNode: scene.pub.constructNode('BoundingBox', {
              bboxmin: FABRIC.RT.vec3(size * -0.3, size * -0.5, size * -0.5),
              bboxmax: FABRIC.RT.vec3(size * 0.3, size * 0.5, size * 0.5)
            }),
            color: FABRIC.RT.rgb(1, 0, 0)
          });

        solver.constructManipulator(name + 'Twist', 'RotationManipulator', {
            parentNode: variablesNode.pub,
            parentMember: name + 'rootXfo',
            localXfo: FABRIC.RT.xfo({ ori: FABRIC.RT.Quat.makeFromAxisAndAngle(FABRIC.RT.vec3(0, 0, 1), 90) }),
            color: FABRIC.RT.rgb(0, .5, 0),
            radius: size
          });

        solver.constructManipulator(name + 'Alignment', 'BoneManipulator', {
            parentNode: variablesNode.pub,
            parentMember: name + 'rootXfo',
            length: size * 1.5,
            boneVector: FABRIC.RT.vec3(1, 0, 0),
            color: FABRIC.RT.rgb(0, 0, 1)
          });
      }
    }

    bindToRig();

    return solver;
  });


FABRIC.SceneGraph.CharacterSolvers.registerSolver('IK2BoneSolver',
  function(options, scene) {
    scene.assignDefaults(options, {
      });
    var solver,
      parameterLayout,
      bindToRig;

    options.identifiers = ['boneA', 'boneB', 'targetParent', 'upvectorParent'];

    solver = FABRIC.SceneGraph.CharacterSolvers.createSolver('CharacterSolver', options, scene);

    bindToRig = function() {

      var rigNode = scene.getPrivateInterface(options.rigNode),
        constantsNode = scene.getPrivateInterface(rigNode.pub.getConstantsNode()),
        variablesNode = scene.getPrivateInterface(rigNode.pub.getVariablesNode()),
        skeletonNode = rigNode.pub.getSkeletonNode(),
        bones = skeletonNode.getBones(),
        referencePose = skeletonNode.getReferencePose(),
        boneIDs = solver.getBoneIDs(),
        name = options.name,
        targetPos,
        target,
        lengthCenter,
        center,
        height,
        upvectorPos,
        upvector;

      // check if the bones have a length
      if (!bones[boneIDs.boneA].length) {
        throw ('Cannot solve IK2Bone for bone ' + bones[boneIDs.boneA].name + ', because it has length == 0.');
      }
      if (!bones[boneIDs.boneB].length) {
        throw ('Cannot solve IK2Bone for bone ' + bones[boneIDs.boneB].name + ', because it has length == 0.');
      }

      // compute the target
      targetPos = referencePose[boneIDs.boneB].transform(new FABRIC.RT.Vec3(bones[boneIDs.boneB].length, 0, 0));
      targetXfo = referencePose[boneIDs.targetParent].multiplyInv(FABRIC.RT.xfo({ tr: targetPos }));

      // compute the upvector
      targetPos.subInPlace(referencePose[boneIDs.boneA].tr);
      lengthCenter = targetPos.unit().dot(referencePose[boneIDs.boneA].ori.getXaxis()) * bones[boneIDs.boneB].length;
      center = targetPos.unit().scale(lengthCenter).add(referencePose[boneIDs.boneA].tr);
      center.addInPlace(targetPos);
      center.addInPlace(referencePose[boneIDs.boneA].tr);
      center.mulInPlace(0.5);

      height = referencePose[boneIDs.boneB].tr.subtract(center);
      upvectorPos = referencePose[boneIDs.boneB].tr.add(height).add(height);
      upvector = referencePose[boneIDs.upvectorParent].multiplyInv(FABRIC.RT.xfo({ tr: upvectorPos }));
      
      if(options.projectTargetToUpvectorFactor != undefined) {
        upvector.tr = targetXfo.tr.scale(options.projectTargetToUpvectorFactor);
      }

      constantsNode.pub.addMember(name + 'boneA', 'Integer', boneIDs.boneA);
      constantsNode.pub.addMember(name + 'boneB', 'Integer', boneIDs.boneB);
      constantsNode.pub.addMember(name + 'targetParent', 'Integer', boneIDs.targetParent);
      constantsNode.pub.addMember(name + 'upvectorParent', 'Integer', boneIDs.upvectorParent);

      variablesNode.pub.addMember(name + 'target', 'Xfo', targetXfo);
      variablesNode.pub.addMember(name + 'upvector', 'Xfo', upvector);

      variablesNode.pub.addMember(name + 'directionBlend', 'Scalar',
        options.directionBlend != undefined ? options.directionBlend : 1.0);
      variablesNode.pub.addMember(name + 'upvectorBlend', 'Scalar',
        options.upvectorBlend != undefined ? options.upvectorBlend : 1.0);

      // insert at the previous to last position to ensure that we keep the last operator
      var opBindings = rigNode.getDGNode().bindings;
      opBindings.insert(scene.constructOperator({
          operatorName: 'solveIK2Bone',
          srcFile: 'FABRIC_ROOT/SceneGraph/KL/solveIK2Bone.kl',
          entryFunctionName: 'solveIK2Bone',
          parameterLayout: solver.setParameterBinding([
            'self.pose',
            'skeleton.bones',
            'constants.' + name + 'boneA',
            'constants.' + name + 'boneB',
            'constants.' + name + 'targetParent',
            'constants.' + name + 'upvectorParent',

            'variables.' + name + 'target',
            'variables.' + name + 'upvector',
            'variables.' + name + 'directionBlend',
            'variables.' + name + 'upvectorBlend'
          ])
        }), opBindings.getLength() - 1);

      if (options.createManipulators) {
        // add a manipulation for target and upvector
        solver.constructManipulator(name + 'targetScreen', 'ScreenTranslationManipulator', {
          targetNode: variablesNode.pub,
          targetMember: name + 'target',
          parentNode: rigNode.pub,
          parentMember: 'pose',
          parentMemberIndex: boneIDs['targetParent'],
          color: options.color,
          radius: options.radius
        });
        solver.constructManipulator(name + 'upvectorScreen', 'ScreenTranslationManipulator', {
          targetNode: variablesNode.pub,
          targetMember: name + 'upvector',
          parentNode: rigNode.pub,
          parentMember: 'pose',
          parentMemberIndex: boneIDs['upvectorParent'],
          color: options.color,
          radius: options.radius
        });
      }
    }
    bindToRig();

    return solver;
  });

FABRIC.SceneGraph.CharacterSolvers.registerSolver('SpineSolver',
  function(options, scene) {
    scene.assignDefaults(options, {
        createBaseManipulators: true,
        manipulatorSize: undefined
      });

    var solver,
      parameterLayout,
      bindToRig;

    options.identifiers = [['vertebra'], 'end'];

    solver = FABRIC.SceneGraph.CharacterSolvers.createSolver('CharacterSolver', options, scene);

    bindToRig = function() {

      var rigNode = scene.getPrivateInterface(options.rigNode),
        constantsNode = scene.getPrivateInterface(rigNode.pub.getConstantsNode()),
        variablesNode = scene.getPrivateInterface(rigNode.pub.getVariablesNode()),
        skeletonNode = rigNode.pub.getSkeletonNode(),
        bones = skeletonNode.getBones(),
        referencePose = skeletonNode.getReferencePose(),
        boneIDs = solver.getBoneIDs(),
        baseVertebreIndex = boneIDs.vertebra[0],
        size,
        name = options.name;

      // first, we will compute the local transform of the end inside the start's space
      var rootXfo = referencePose[skeletonNode.getParentId(baseVertebreIndex)];
      var startXfo = referencePose[baseVertebreIndex];
      var startlocalXfo = rootXfo ? rootXfo.projectInv(startXfo) : startXfo;
      var endXfo = referencePose[boneIDs.end];
      var endlocalXfo = rootXfo ? rootXfo.projectInv(endXfo) : startXfo.projectInv(endXfo);

      // check if we know the U values
      var uValues = [0];
      var endLength = startXfo.projectInv(endXfo).tr.norm();
      for (var i = 1; i < boneIDs.vertebra.length; i++) {
        var local = startXfo.projectInv(referencePose[boneIDs.vertebra[i]]);
        var u = local.tr.norm() / endLength;
        if (u > 1.0) {
          throw ("Unexpected U value, vertebra '" + bones[boneIDs.vertebra[i]].name + "' outside of  spine.");
        }
        uValues.push(u);
      }
      uValues.push(1.0);

      constantsNode.pub.addMember(name + 'end', 'Integer', boneIDs.end);
      constantsNode.pub.addMember(name + 'vertebra', 'Integer[]', boneIDs.vertebra);

      constantsNode.pub.addMember(name + 'uvalues', 'Scalar[]', uValues);
      constantsNode.pub.addMember(name + 'startTangent', 'Scalar', 0.3);
      constantsNode.pub.addMember(name + 'endTangent', 'Scalar', 0.3);

      variablesNode.pub.addMember(name + 'startlocalXfo', 'Xfo', startlocalXfo);
      variablesNode.pub.addMember(name + 'endlocalXfo', 'Xfo', endlocalXfo);

      // insert at the previous to last position to ensure that we keep the last operator
      var opBindings = rigNode.getDGNode().bindings;
      opBindings.insert(scene.constructOperator({
          operatorName: 'solveSpine',
          srcFile: 'FABRIC_ROOT/SceneGraph/KL/solveSpine.kl',
          entryFunctionName: 'solveSpine',
          parameterLayout: solver.setParameterBinding([
            'self.pose',
            'skeleton.bones',

            'constants.' + name + 'end',
            'constants.' + name + 'vertebra',
            'constants.' + name + 'uvalues',
            'constants.' + name + 'startTangent',
            'constants.' + name + 'endTangent',

            'variables.' + name + 'startlocalXfo',
            'variables.' + name + 'endlocalXfo'
          ])
        }), opBindings.getLength() - 1);

      if (options.createManipulators) {
        size = options.manipulatorSize ? options.manipulatorSize :
          referencePose[baseVertebreIndex].tr.dist(referencePose[boneIDs['end']].tr) * 0.3;

        if (options.createBaseManipulators) {
          solver.constructManipulator(name + 'startRotation', 'RotationManipulator', {
              targetNode: variablesNode.pub,
              targetMember: name + 'startlocalXfo',
              parentNode: rigNode.pub,
              parentMember: 'pose',
              parentMemberIndex: skeletonNode.getParentId(baseVertebreIndex),
              localXfo: FABRIC.RT.xfo({ ori: FABRIC.RT.Quat.makeFromAxisAndAngle(FABRIC.RT.vec3(0, 0, 1), 90) }),
              color: FABRIC.RT.rgb(0, .5, 0),
              radius: size
            });

          solver.constructManipulator(name + 'startBoneRotation', 'BoneManipulator', {
              targetNode: variablesNode.pub,
              targetMember: name + 'startlocalXfo',
              parentNode: rigNode.pub,
              parentMember: 'pose',
              parentMemberIndex: skeletonNode.getParentId(baseVertebreIndex),
              length: size * 1.5,
              boneVector: FABRIC.RT.vec3(1, 0, 0),
              color: FABRIC.RT.rgb(0, 0, 1)
            });

          // add two translations for the start and end as well
          solver.constructManipulator(name + 'startTranslation', 'ScreenTranslationManipulator', {
              targetNode: variablesNode.pub,
              targetMember: name + 'startlocalXfo',
              parentNode: rigNode.pub,
              parentMember: 'pose',
              parentMemberIndex: skeletonNode.getParentId(baseVertebreIndex),
              geometryNode: scene.pub.constructNode('BoundingBox', {
                bboxmin: FABRIC.RT.vec3(size * -0.3, size * -0.5, size * -0.5),
                bboxmax: FABRIC.RT.vec3(size * 0.3, size * 0.5, size * 0.5)
              }),
              color: FABRIC.RT.rgb(1, 0, 0)
            });
        }
        solver.constructManipulator(name + 'endRotation', 'RotationManipulator', {
            targetNode: variablesNode.pub,
            targetMember: name + 'endlocalXfo',
            parentNode: rigNode.pub,
            parentMember: 'pose',
            parentMemberIndex: skeletonNode.getParentId(baseVertebreIndex),
            localXfo: FABRIC.RT.xfo({ ori: FABRIC.RT.Quat.makeFromAxisAndAngle(FABRIC.RT.vec3(0, 0, 1), 90) }),
            color: FABRIC.RT.rgb(0, .5, 0),
            radius: size
          });


        solver.constructManipulator(name + 'endBoneRotation', 'BoneManipulator', {
            targetNode: variablesNode.pub,
            targetMember: name + 'endlocalXfo',
            parentNode: rigNode.pub,
            parentMember: 'pose',
            parentMemberIndex: skeletonNode.getParentId(baseVertebreIndex),
            length: size * 1.5,
            boneVector: FABRIC.RT.vec3(-1, 0, 0),
            color: FABRIC.RT.rgb(0, 0, 1)
          });


        solver.constructManipulator(name + 'endTranslation', 'ScreenTranslationManipulator', {
            targetNode: variablesNode.pub,
            targetMember: name + 'endlocalXfo',
            parentNode: rigNode.pub,
            parentMember: 'pose',
            parentMemberIndex: skeletonNode.getParentId(baseVertebreIndex),
            geometryNode: scene.pub.constructNode('BoundingBox', {
              bboxmin: FABRIC.RT.vec3(size * -0.3, size * -0.5, size * -0.5),
              bboxmax: FABRIC.RT.vec3(size * 0.3, size * 0.5, size * 0.5)
            }),
            color: FABRIC.RT.rgb(1, 0, 0)
          });
      }
    };

    bindToRig();

    return solver;
  });



FABRIC.SceneGraph.CharacterSolvers.registerSolver('TwistBoneSolver',
  function(options, scene) {

    var solver,
      parameterLayout,
      bindToRig;

    options.identifiers = ['start', 'end', ['twistBones']];

    solver = FABRIC.SceneGraph.CharacterSolvers.createSolver('CharacterSolver', options, scene);

    bindToRig = function() {

      var rigNode = scene.getPrivateInterface(options.rigNode),
        constantsNode = scene.getPrivateInterface(rigNode.pub.getConstantsNode()),
        variablesNode = scene.getPrivateInterface(rigNode.pub.getVariablesNode()),
        skeletonNode = rigNode.pub.getSkeletonNode(),
        bones = skeletonNode.getBones(),
        referencePose = skeletonNode.getReferencePose(),
        boneIDs = solver.getBoneIDs(),
        size,
        name = options.name;

      // first, we will compute the local transform of the end inside the start's space
      var startXfo = referencePose[boneIDs.start];
      var endXfo = referencePose[boneIDs.end];

      // check if we know the U values
      var uValues = options.uValues;
      if (!uValues) {
        uValues = [];
        var boneLength = startXfo.projectInv(endXfo).tr.norm();
        for (var i = 0; i < boneIDs.twistBones.length; i++) {
          var local = startXfo.projectInv(referencePose[boneIDs.twistBones[i]]);
          var u = local.tr.norm() / boneLength;
          if (u > 1.0) {
            throw ("Unexpected U value, twistBone '" + bones[boneIDs.twistBones[i]].name + "' outside of bone.");
          }
          uValues.push(u);
        }
      }
      constantsNode.pub.addMember(name + 'start', 'Integer', boneIDs.start);
      constantsNode.pub.addMember(name + 'end', 'Integer', boneIDs.end);
      constantsNode.pub.addMember(name + 'twistBones', 'Integer[]', boneIDs.twistBones);
      constantsNode.pub.addMember(name + 'uvalues', 'Scalar[]', uValues);

      // insert at the previous to last position to ensure that we keep the last operator
      var opBindings = rigNode.getDGNode().bindings;
      opBindings.insert(scene.constructOperator({
          operatorName: 'solveTwistBones',
          srcFile: 'FABRIC_ROOT/SceneGraph/KL/solveTwistBones.kl',
          entryFunctionName: 'solveTwistBones',
          parameterLayout: [
            'self.pose',
            'skeleton.bones',
            'constants.' + name + 'start',
            'constants.' + name + 'end',
            'constants.' + name + 'twistBones',
            'constants.' + name + 'uvalues'
          ]
        }), opBindings.getLength() - 1);
    };

    bindToRig();

    return solver;
  });




FABRIC.SceneGraph.CharacterSolvers.registerSolver('BlendBoneSolver',
  function(options, scene) {

    var solver,
      parameterLayout,
      bindToRig;

    options.identifiers = ['start', 'end', ['blendBones']];

    solver = FABRIC.SceneGraph.CharacterSolvers.createSolver('CharacterSolver', options, scene);

    bindToRig = function() {

      var rigNode = scene.getPrivateInterface(options.rigNode),
        constantsNode = scene.getPrivateInterface(rigNode.pub.getConstantsNode()),
        variablesNode = scene.getPrivateInterface(rigNode.pub.getVariablesNode()),
        skeletonNode = rigNode.pub.getSkeletonNode(),
        bones = skeletonNode.getBones(),
        referencePose = skeletonNode.getReferencePose(),
        boneIDs = solver.getBoneIDs(),
        size,
        name = options.name;

      if (!options.blendWeights) {
        throw ('Error in BlendBoneSolver: blendWeights not specified ');
      }
      if (options.blendWeights.length != boneIDs.blendBones.length) {
        throw ('Error in BlendBoneSolver: blendWeights.length != blendBones.length ');
      }

      // first, we will compute the local transform of the end inside the start's space
      var startXfo = referencePose[boneIDs.start];
      var endXfo = referencePose[boneIDs.end];

      var blendBoneOffsets = [];
      for (var i = 0; i < boneIDs.blendBones.length; i++) {
        var blendedXfo = startXfo.clone();
        blendedXfo.ori = FABRIC.RT.Quat.makeSlerp(startXfo.ori, startXfo.ori, options.blendWeights[i]);
        blendBoneOffsets.push(startXfo.projectInv(blendedXfo));
      }
      constantsNode.pub.addMember(name + 'start', 'Integer', boneIDs.start);
      constantsNode.pub.addMember(name + 'end', 'Integer', boneIDs.end);
      constantsNode.pub.addMember(name + 'blendBones', 'Integer[]', boneIDs.blendBones);
      constantsNode.pub.addMember(name + 'blendBoneOffsets', 'Xfo[]', blendBoneOffsets);
      constantsNode.pub.addMember(name + 'blendWeights', 'Scalar[]', options.blendWeights);

      // insert at the previous to last position to ensure that we keep the last operator
      var opBindings = rigNode.getDGNode().bindings;
      opBindings.insert(scene.constructOperator({
          operatorName: 'solveBlendBones',
          srcFile: 'FABRIC_ROOT/SceneGraph/KL/solveTwistBones.kl',
          entryFunctionName: 'solveBlendBones',
          parameterLayout: [
            'self.pose',
            'skeleton.bones',
            'constants.' + name + 'start',
            'constants.' + name + 'end',
            'constants.' + name + 'blendBones',
            'constants.' + name + 'blendBoneOffsets',
            'constants.' + name + 'blendWeights'
          ]
        }), opBindings.getLength() - 1);
    };

    bindToRig();

    return solver;
  });




FABRIC.SceneGraph.CharacterSolvers.registerSolver('FishingRodSolver',
  function(options, scene) {

    scene.assignDefaults(options, {
        rigNode: undefined,
        targetXfo: FABRIC.RT.xfo()
      });
    var solver,
      parameterLayout,
      bindToRig;

    options.identifiers = ['rod'];

    solver = FABRIC.SceneGraph.CharacterSolvers.createSolver('CharacterSolver', options, scene);

    bindToRig = function() {

      var rigNode = scene.getPrivateInterface(options.rigNode),
        constantsNode = scene.getPrivateInterface(rigNode.pub.getConstantsNode()),
        variablesNode = scene.getPrivateInterface(rigNode.pub.getVariablesNode()),
        skeletonNode = rigNode.pub.getSkeletonNode(),
        bones = skeletonNode.getBones(),
        referencePose = skeletonNode.getReferencePose(),
        boneIDs = solver.getBoneIDs(),
        name = options.name,
        rodTipPos,
        lineLength,
        i,
        lastBoneIndex;

      // check if the bones have a length
      if (bones[boneIDs.rod].length <= 0.0) {
        throw ("Cannot solve FishingRodSolver for bone '" +
          bones[boneIDs.bones[i]].name + "', because it has length == 0.");
      }

      // compute the target
      rodTipPos = referencePose[boneIDs.rod].transform(FABRIC.RT.vec3(bones[boneIDs.rod].length, 0, 0));
      lineLength = rodTipPos.dist(options.targetXfo.tr);

      constantsNode.pub.addMember(name + 'boneIndex', 'Integer', boneIDs.rod);
      variablesNode.pub.addMember(name + 'lineLength', 'Scalar', lineLength);
      variablesNode.pub.addMember(name + 'minLineLength', 'Scalar', lineLength * 0.5);
      variablesNode.pub.addMember(name + 'maxLineLength', 'Scalar', lineLength * 2.0);
      variablesNode.pub.addMember(name + 'target', 'Xfo', options.targetXfo);

      // insert at the previous to last position to ensure that we keep the last operator
      var opBindings = rigNode.getDGNode().bindings;
      opBindings.insert(scene.constructOperator({
          operatorName: 'solveFishingRod',
          srcFile: 'FABRIC_ROOT/SceneGraph/KL/solveFishingRod.kl',
          entryFunctionName: 'fishingRodOp',
          parameterLayout: solver.setParameterBinding([
            'self.pose',
            'skeleton.bones',
            'constants.' + name + 'boneIndex',
            'variables.' + name + 'lineLength',
            'variables.' + name + 'minLineLength',
            'variables.' + name + 'maxLineLength',
            'variables.' + name + 'target'
          ])
        }), opBindings.getLength() - 1);

      if (options.createManipulators) {
        // add a manipulation for target and upvector
        solver.constructManipulator(name + 'targetScreen', 'ScreenTranslationManipulator', {
          parentNode: variablesNode.pub,
          parentMember: name + 'target'
        });
      }
    }
    bindToRig();

    return solver;
  });


FABRIC.SceneGraph.CharacterSolvers.registerSolver('NCFIKSolver',
  function(options, scene) {

    scene.assignDefaults(options, {
        rigNode: undefined
      });
    var solver,
      parameterLayout,
      bindToRig;

    options.identifiers = [['bones'], 'targetParent'];

    solver = FABRIC.SceneGraph.CharacterSolvers.createSolver('CharacterSolver', options, scene);

    bindToRig = function() {

      var rigNode = scene.getPrivateInterface(options.rigNode),
        constantsNode = scene.getPrivateInterface(rigNode.pub.getConstantsNode()),
        variablesNode = scene.getPrivateInterface(rigNode.pub.getVariablesNode()),
        skeletonNode = rigNode.pub.getSkeletonNode(),
        bones = skeletonNode.getBones(),
        referencePose = skeletonNode.getReferencePose(),
        boneIDs = solver.getBoneIDs(),
        name = options.name,
        targetPos,
        targetXfo,
        i,
        lastBoneIndex;

      // check if the bones have a length
      for (i = 0; i < boneIDs.bones.length; i++) {
        if (bones[boneIDs.bones[i]].length <= 0.0) {
          throw ('Cannot solve IK2Bone for bone ' + bones[boneIDs.bones[i]].name + ', because it has length == 0.');
        }
      }

      lastBoneIndex = boneIDs.bones[boneIDs.bones.length - 1];

      // compute the target
      targetPos = referencePose[lastBoneIndex].transform(FABRIC.RT.vec3(bones[lastBoneIndex].length, 0, 0));
      targetXfo = referencePose[boneIDs.targetParent].multiplyInv(FABRIC.RT.xfo({ tr: targetPos }));

      constantsNode.pub.addMember(name + 'boneIndices', 'Integer[]', boneIDs.bones);
      variablesNode.pub.addMember(name + 'target', 'Xfo', targetXfo);

      // insert at the previous to last position to ensure that we keep the last operator
      var opBindings = rigNode.getDGNode().bindings;
      opBindings.insert(scene.constructOperator({
          operatorName: 'solveNCFIK',
          srcFile: 'FABRIC_ROOT/SceneGraph/KL/solveNCFIK.kl',
          entryFunctionName: 'solveNCFIK',
          parameterLayout: solver.setParameterBinding([
            'self.pose',
            'skeleton.bones',
            'constants.' + name + 'boneIndices',
            'variables.' + name + 'target'
          ])
        }), opBindings.getLength() - 1);

      if (options.createManipulators) {
        // add a manipulation for target and upvector
        solver.constructManipulator(name + 'targetScreen', 'ScreenTranslationManipulator', {
          targetNode: variablesNode.pub,
          targetMember: name + 'target',
          parentNode: rigNode.pub,
          parentMember: 'pose',
          parentMemberIndex: boneIDs.targetParent
        });
      }
    }
    bindToRig();

    return solver;
  });




FABRIC.SceneGraph.CharacterSolvers.registerSolver('ArmSolver',
  function(options, scene) {

    scene.assignDefaults(options, {
      });
    var solver,
      parameterLayout,
      bindToRig;

    options.identifiers = [['bones']];

    solver = FABRIC.SceneGraph.CharacterSolvers.createSolver('CharacterSolver', options, scene);

    bindToRig = function() {

      var rigNode = scene.getPrivateInterface(options.rigNode),
        constantsNode = scene.getPrivateInterface(rigNode.pub.getConstantsNode()),
        variablesNode = scene.getPrivateInterface(rigNode.pub.getVariablesNode()),
        skeletonNode = rigNode.pub.getSkeletonNode(),
        bones = skeletonNode.getBones(),
        referencePose = skeletonNode.getReferencePose(),
        referenceLocalPose = skeletonNode.getReferenceLocalPose(),
        boneIDs = solver.getBoneIDs(),
        name = options.name,
        footPlatformXfo,
        wristOffsetXfo,
        i,
        lastBoneIndex,
        twistManipulators = [];

      // check if the bones have a length
      for (i = 0; i < boneIDs.bones.length; i++) {
        if (bones[boneIDs.bones[i]].length <= 0.0) {
          throw ('Cannot solve IK2Bone for bone ' + bones[boneIDs.bones[i]].name + ', because it has length == 0.');
        }
        twistManipulators.push(i != 0 /*&&  i != 2 */);
      }


      rigNode.pub.addSolver(name + 'fk', 'FKChainSolver', {
        chainManipulators: false,
        bones: options.bones,
        color: options.color,
        twistManipulators: twistManipulators,
        twistManipulatorRadius: bones[boneIDs.bones[0]].length * 0.3
      });

      // compute the target
      var wristBoneIndex = boneIDs.bones[boneIDs.bones.length - 1];
      handControlXfo = referencePose[wristBoneIndex].clone();
      handControlXfo.tr = referencePose[wristBoneIndex].transform(FABRIC.RT.vec3(bones[wristBoneIndex].length, 0, 0));
      wristOffsetXfo = handControlXfo.multiplyInv(referencePose[wristBoneIndex]);

      constantsNode.pub.addMember(name + 'bones', 'Integer[]', boneIDs.bones);
      constantsNode.pub.addMember(name + 'wristOffsetXfo', 'Xfo', wristOffsetXfo);

      variablesNode.pub.addMember(name + 'handControlXfo', 'Xfo', handControlXfo);
      variablesNode.pub.addMember(name + 'IKBlend', 'Scalar', 1.0);

      // insert at the previous to last position to ensure that we keep the last operator
      var opBindings = rigNode.getDGNode().bindings;
      opBindings.insert(scene.constructOperator({
          operatorName: 'solveArmRig',
          srcFile: 'FABRIC_ROOT/SceneGraph/KL/solveLimbIK.kl',
          entryFunctionName: 'solveArmRig',
          parameterLayout: solver.setParameterBinding([
            'self.pose',
            'skeleton.bones',
            'constants.' + name + 'bones',
            'constants.' + name + 'wristOffsetXfo',

            'variables.' + name + 'handControlXfo',
            'variables.' + name + 'IKBlend'
          ])
        }), opBindings.getLength() - 1);

      if (options.createManipulators) {
        var size = bones[wristBoneIndex].length;

        solver.constructManipulator(name + 'WristTwistRotation', 'RotationManipulator', {
            parentNode: variablesNode.pub,
            parentMember: name + 'handControlXfo',
            localXfo: FABRIC.RT.xfo({ ori: FABRIC.RT.Quat.makeFromAxisAndAngle(FABRIC.RT.vec3(0, 0, 1), 90) }),
            color: FABRIC.RT.rgb(0, .5, 0),
            radius: size
          });

        solver.constructManipulator(name + 'WristRollRotation', 'RotationManipulator', {
            parentNode: variablesNode.pub,
            parentMember: name + 'handControlXfo',
            color: FABRIC.RT.rgb(0, .5, 0),
            radius: size
          });

        solver.constructManipulator(name + 'WristRotation', 'BoneManipulator', {
            parentNode: variablesNode.pub,
            parentMember: name + 'handControlXfo',
            length: size,
            boneVector: FABRIC.RT.vec3(1, 0, 0),
            color: FABRIC.RT.rgb(0, 0, 1)
          });

        // add a manipulation for target and upvector
        solver.constructManipulator(name + 'targetScreen', 'ScreenTranslationManipulator', {
          parentNode: variablesNode.pub,
          parentMember: name + 'handControlXfo',
          geometryNode: scene.pub.constructNode('BoundingBox', {
                bboxmin: FABRIC.RT.vec3(size * -0.8, size * -0.7, size * -0.4),
                bboxmax: FABRIC.RT.vec3(size * 0.8, size * 0.7, size * 0.4)
              }),
          color: FABRIC.RT.rgb(1, 0, 0)
        });
      }
    }
    bindToRig();

    return solver;
  });

FABRIC.SceneGraph.CharacterSolvers.registerSolver('LegSolver',
  function(options, scene) {

    scene.assignDefaults(options, {
        rigNode: undefined
      });
    var solver,
      parameterLayout,
      bindToRig;

    options.identifiers = [['bones']];

    solver = FABRIC.SceneGraph.CharacterSolvers.createSolver('CharacterSolver', options, scene);

    bindToRig = function() {

      var rigNode = scene.getPrivateInterface(options.rigNode),
        constantsNode = scene.getPrivateInterface(rigNode.pub.getConstantsNode()),
        variablesNode = scene.getPrivateInterface(rigNode.pub.getVariablesNode()),
        skeletonNode = rigNode.pub.getSkeletonNode(),
        bones = skeletonNode.getBones(),
        referencePose = skeletonNode.getReferencePose(),
        referenceLocalPose = skeletonNode.getReferenceLocalPose(),
        boneIDs = solver.getBoneIDs(),
        name = options.name,
        footPlatformXfo,
        ankleOffsetXfo,
        ankleTipXfo,
        i,
        ankleIndex = boneIDs.bones[boneIDs.bones.length - 1],
        twistManipulators = [];

      // check if the bones have a length
      for (i = 0; i < boneIDs.bones.length; i++) {
        if (bones[boneIDs.bones[i]].length <= 0.0) {
          throw ('Cannot solve IK2Bone for bone ' + bones[boneIDs.bones[i]].name + ', because it has length == 0.');
        }
        twistManipulators.push(true); //i != 1);
      }

      rigNode.pub.addSolver(name + 'fk', 'FKChainSolver', {
        chainManipulators: false,
        bones: options.bones,
        color: options.color,
        twistManipulators: twistManipulators,
        twistManipulatorRadius: bones[boneIDs.bones[0]].length * 0.3
      });

      // compute the target
      ankleTipXfo = referencePose[ankleIndex].clone();
      ankleTipXfo.tr = referencePose[ankleIndex].transform(FABRIC.RT.vec3(bones[ankleIndex].length, 0, 0));
      footPlatformXfo = ankleTipXfo.clone();
      footPlatformXfo.tr.y = 0;
      footPlatformXfo.ori.postMultiplyInPlace(
        FABRIC.RT.Quat.makeFrom2Vectors(
          footPlatformXfo.ori.rotateVector(FABRIC.RT.vec3(0, 1, 0)),
          FABRIC.RT.vec3(0, 1, 0)
       )
     );

      ankleOffsetXfo = footPlatformXfo.multiplyInv(ankleTipXfo);


      constantsNode.pub.addMember(name + 'bones', 'Integer[]', boneIDs.bones);
    //  constantsNode.pub.addMember(name+"ankleOffsetXfo", "Xfo", ankleOffsetXfo);
      variablesNode.pub.addMember(name + 'footPlatformXfo', 'Xfo', footPlatformXfo);
      variablesNode.pub.addMember(name + 'ankleIKAnimationXfo', 'Xfo', ankleOffsetXfo);
      variablesNode.pub.addMember(name + 'IKBlend', 'Scalar', 1.0);

      // insert at the previous to last position to ensure that we keep the last operator
      var opBindings = rigNode.getDGNode().bindings;
      opBindings.insert(scene.constructOperator({
          operatorName: 'solveLegRig',
          srcFile: 'FABRIC_ROOT/SceneGraph/KL/solveLimbIK.kl',
          entryFunctionName: 'solveLegRig',
          parameterLayout: solver.setParameterBinding([
            'self.pose',
            'skeleton.bones',
            'constants.' + name + 'bones',

            'variables.' + name + 'footPlatformXfo',
            'variables.' + name + 'ankleIKAnimationXfo',
            'variables.' + name + 'IKBlend'
          ])
        }), opBindings.getLength() - 1);

      if (options.createManipulators) {
        // add a manipulation for target and upvector
        solver.constructManipulator(name + 'FootTranslate', 'ScreenTranslationManipulator', {
          parentNode: variablesNode.pub,
          parentMember: name + 'footPlatformXfo',
          geometryNode: scene.pub.constructNode('Cross', { size: bones[ankleIndex].length * 0.5 }),
          color: FABRIC.RT.rgb(1, 0, 0)
        });

        solver.constructManipulator(name + 'FootRotate', 'PivotRotationManipulator', {
          parentNode: variablesNode.pub,
          parentMember: name + 'footPlatformXfo',
          radius: bones[ankleIndex].length,
          geometryNode: scene.pub.constructNode('Rectangle', {
            length: bones[ankleIndex].length * 2,
            width: bones[ankleIndex].length
          }),
          color: FABRIC.RT.rgb(0, 0, 1)
        });

        solver.constructManipulator(name + 'AnkleRotate', 'BoneManipulator', {
          targetNode: variablesNode.pub,
          targetMember: name + 'ankleIKAnimationXfo',
          parentMember: name + 'footPlatformXfo',
          length: bones[ankleIndex].length * 2.0,
          boneVector: FABRIC.RT.vec3(-1, 0, 0),
          color: FABRIC.RT.rgb(0, 0, 1)
        });

      }
    }
    bindToRig();

    return solver;
  });

