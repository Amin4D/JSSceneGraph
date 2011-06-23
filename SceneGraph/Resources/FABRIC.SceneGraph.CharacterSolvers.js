
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
      throw ('CharacterSolver "' + type + '" already Registered');
      }else {
      this.solvers[type] = factoryFn;
    }
  },
  constructSolver: function(type, options, scene) {
    if (!this.solvers[type]) {
      throw ('CharacterSolver "' + type + '" is not registered.');
    }
    options.type = options.type ? options.type : type;
    var solver = this.solvers[type](options, scene);
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
      createManipulators: true,
      inverse: false,
      allowInverse: true
    });

    if (!options.rigNode) {
      throw ('You must specify the rigNode.');
      }

    var parameterBinding;

    var boneIDs = {},
    manipulators = {},
    debugMembers = {};

    var solver = {
      getType: function() {
        return options.type;
      },
      getBoneIDs: function() {
        return boneIDs;
      },
      getBoneIndex: function(name) {
        return boneIDs[name];
      },
      getInvBoneIDs: function() {
        return options.invBoneIDs ? options.invBoneIDs : {};
      },
      getInvBoneIndex: function(name) {
        return options.invBoneIDs ? options.invBoneIDs[name] : undefined;
      },
      constructManipulator: function(name, manipulatorType, options) {
        if (manipulators[name]) {
          throw (' Manipulator names must be unique. Solver "' + name + '" already contains :"' + name + '"');
          }
        options.name = name;
        manipulators[name] = scene.constructNode(manipulatorType, options);
        return manipulators[name];
      },
      getManipulators: function() {
        return manipulators;
      },
      getParameterBinding: function() {
        return parameterBinding;
      },
      setParameterBinding: function(binding) {
        parameterBinding = binding;
        return parameterBinding;
      },
      constructInverseSolver: function(solverOptions) {
        if (!solverOptions.srcRigNode) {
          throw ('You need to specify a valid srcRigNode!');
          }
        if (!solverOptions.boneMapping) {
          throw ('You need to specify a valid boneMapping!');
          }
        if(!options.allowInverse)
          return undefined;

        // create the new options!
        var newOptions = {};
        for (var option in options) {
          newOptions[option] = options[option];
        }
        // copy the src character rig node and the bone mapping
        newOptions.srcRigNode = solverOptions.srcRigNode;
        newOptions.inverse = true;
        newOptions.invBoneIDs = boneIDs;

        // get both name maps
        var tgtBoneNames = options.rigNode.getSkeletonNode().getBoneNamesMap();
        var srcBoneNames = solverOptions.srcRigNode.getSkeletonNode().getBoneNamesMap();

        // ensure that all bones exist
        for (var boneName in solverOptions.boneMapping) {
          if (tgtBoneNames[boneName] == undefined)
            throw ('Bone "' + boneName + '" does not exist on tgt rigNode.')
          if (srcBoneNames[solverOptions.boneMapping[boneName]] == undefined)
            throw ('Bone "' + solverOptions.boneMapping[boneName] + '" does not exist on src rigNode.')
        }

        // now remap the bones
        var bones = newOptions.bones;
        newOptions.bones = {};
        for (var boneGroup in bones) {
          if (bones[boneGroup].constructor.name === 'Array') {
            newOptions.bones[boneGroup] = [];
            newOptions.bones['inv'+boneGroup] = [];
            for(var i=0;i<bones[boneGroup].length;i++){
              if(solverOptions.boneMapping[bones[boneGroup][i]] == undefined)
                continue;
              newOptions.bones[boneGroup].push(solverOptions.boneMapping[bones[boneGroup][i]]);
              newOptions.bones['inv'+boneGroup].push(bones[boneGroup][i]);
            }
          }else{
            // check if this is a invalid definition (id == -1)
            if(bones[boneGroup] == -1){
              newOptions.bones[boneGroup] = -1;
              newOptions.bones['inv'+boneGroup] = -1;
              continue;
            }
            if(solverOptions.boneMapping[bones[boneGroup]] == undefined)
              continue;
            newOptions.bones[boneGroup] = solverOptions.boneMapping[bones[boneGroup]];
            newOptions.bones['inv'+boneGroup] = bones[boneGroup][i];
          }
        }
        
        // finally, create the inverse solver
        return FABRIC.SceneGraph.CharacterSolvers.constructSolver(newOptions.type, newOptions, scene);
      },
      setDebugMember: function(memberName, parentIndex){
        debugMembers[memberName] = parentIndex;
      },
      getDebugMembers: function(){
        return debugMembers;
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
    var boneNames = [];
    if(options.inverse)
      boneNames = options.srcRigNode.getSkeletonNode().getBoneNames();
    else
      boneNames = options.rigNode.getSkeletonNode().getBoneNames();
    for (var i = 0; i < boneNames.length; i++) {
      name2id[boneNames[i]] = i;
    }
    // let's check the identifiers
    for (var i = 0; i < options.identifiers.length; i++) {
      if (options.identifiers[i].constructor.name === 'Array') {
        var name = options.identifiers[i][0];
        if (!options.bones[name]) {
          throw ('"' + name + '" were not specified.');
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
          throw ('"' + name + '" were not specified.');
          }
        if(options.bones[name] == -1){
          boneIDs[name] = -1;
          continue;
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
    parameterBinding,
    bindToRig;

    scene.assignDefaults(options, {
      reprojectInverse: true
    });

    // ensure to have a full set
    if (options.rigNode && !options.bones) {
      options.bones = {};
      options.bones.bones = options.rigNode.getSkeletonNode().getBoneNames();
    }
    options.identifiers = [['bones']];

    solver = FABRIC.SceneGraph.CharacterSolvers.constructSolver('CharacterSolver', options, scene);

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

      var boneIndices = solver.getBoneIDs().bones;
      
      // determine if we need to create the
      // positive or inverse operator!
      if(!options.inverse){
        constantsNode.pub.addMember(name + 'boneIndices', 'Integer[]', boneIndices);
  
        if (options.localxfoMemberName == undefined) {
          var localXfos = [];
          for (var i = 0; i < boneIndices.length; i++) {
            localXfos.push(referenceLocalPose[boneIndices[i]]);
          }
          variablesNode.pub.addMember(name + 'localXfos', 'Xfo[]', localXfos);
          options.localxfoMemberName = name + 'localXfos';
        }
  
        // insert at the previous to last position to ensure that we keep the last operator
        var opBindings = scene.getPrivateInterface(rigNode).getDGNode().bindings;
        opBindings.insert(scene.constructOperator({
              operatorName: 'solveFKHierarchy',
              srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/solveFKHierarchy.kl',
              entryFunctionName: 'solveFKHierarchy',
              parameterBinding: solver.setParameterBinding([
                'self.pose',
                'skeleton.bones',
                'constants.' + name + 'boneIndices',
                'variables.' + options.localxfoMemberName
              ])
          }),
        opBindings.getLength() - 1);
      
      }else{
        
        constantsNode.pub.addMember(name + 'invSrcBoneIndices', 'Integer[]', boneIndices);
        constantsNode.pub.addMember(name + 'invTgtBoneIndices', 'Integer[]', solver.getInvBoneIDs().bones);
        constantsNode.pub.addMember(name + 'invReproject', 'Boolean', !(!options.reprojectInverse));
        
        // insert at the previous to last position to ensure that we keep the last operator
        var opBindings = variablesNode.getDGNode().bindings;
        opBindings.append(scene.constructOperator({
              operatorName: 'solveInvFKHierarchy',
              srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/solveFKHierarchy.kl',
              entryFunctionName: 'solveInvFKHierarchy',
              parameterBinding: solver.setParameterBinding([
                'srcrig.pose',
                'srcskeleton.bones',
                'skeleton.bones',
                'constants.' + name + 'invSrcBoneIndices',
                'constants.' + name + 'invTgtBoneIndices',
                'constants.' + name + 'invReproject',
                'self.' + options.localxfoMemberName
              ])
          }));
      }
    };

    bindToRig();

    return solver;
});

FABRIC.SceneGraph.CharacterSolvers.registerSolver('GlobalSolver',
  function(options, scene) {

    var solver,
    parameterBinding,
    bindToRig;

    // ensure to have a full set
    if (options.rigNode && !options.bones) {
      options.bones = {};
      options.bones.bones = options.rigNode.getSkeletonNode().getBoneNames();
    }
    options.identifiers = [['bones']];

    solver = FABRIC.SceneGraph.CharacterSolvers.constructSolver('CharacterSolver', options, scene);

    bindToRig = function() {

      var rigNode = options.rigNode,
      constantsNode = scene.getPrivateInterface(rigNode.getConstantsNode()),
      variablesNode = scene.getPrivateInterface(rigNode.getVariablesNode()),
      skeletonNode = rigNode.getSkeletonNode(),
      bones = skeletonNode.getBones(),
      referencePose = skeletonNode.getReferencePose(),
      boneIDs = solver.getBoneIDs(),
      size,
      name = options.name;

      var boneIndices = solver.getBoneIDs().bones;
      
      // determine if we need to create the
      // positive or inverse operator!
      if(!options.inverse){
        constantsNode.pub.addMember(name + 'boneIndices', 'Integer[]', boneIndices);
  
        if (options.globalxfoMemberName == undefined) {
          var globalXfos = [];
          for (var i = 0; i < boneIndices.length; i++) {
            globalXfos.push(referencePose[boneIndices[i]]);
          }
          variablesNode.pub.addMember(name + 'globalXfos', 'Xfo[]', globalXfos);
          options.globalxfoMemberName = name + 'globalXfos';
        }
  
        // insert at the previous to last position to ensure that we keep the last operator
        var opBindings = scene.getPrivateInterface(rigNode).getDGNode().bindings;
        opBindings.insert(scene.constructOperator({
              operatorName: 'solveGlobalPose',
              srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/solveFKHierarchy.kl',
              entryFunctionName: 'solveGlobalPose',
              parameterBinding: solver.setParameterBinding([
                'self.pose',
                'skeleton.bones',
                'constants.' + name + 'boneIndices',
                'variables.' + options.globalxfoMemberName
              ])
          }),
        opBindings.getLength() - 1);
      
      }else{
        constantsNode.pub.addMember(name + 'invBoneIndices', 'Integer[]', boneIndices);
      
        // insert at the previous to last position to ensure that we keep the last operator
        var opBindings = variablesNode.getDGNode().bindings;
        opBindings.append(scene.constructOperator({
              operatorName: 'solveInvGlobalPose',
              srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/solveFKHierarchy.kl',
              entryFunctionName: 'solveInvGlobalPose',
              parameterBinding: solver.setParameterBinding([
                'srcrig.pose',
                'srcskeleton.bones',
                'constants.' + name + 'invBoneIndices',
                'self.' + options.globalxfoMemberName
              ])
          }));
      }
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
    parameterBinding,
    bindToRig;

    // ensure to have a full set
    if (options.rigNode && !options.bones) {
      options.bones = {};
      options.bones.bones = options.rigNode.getSkeletonNode().getBoneNames();
    }
    options.identifiers = [['bones']];

    solver = FABRIC.SceneGraph.CharacterSolvers.constructSolver('CharacterSolver', options, scene);

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
      childManipulator,
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
        srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/solveFKHierarchy.kl',
        entryFunctionName: 'solveChain',
        parameterBinding: solver.setParameterBinding([
          'self.pose',
          'self.' + name + 'globalXfos',
          'skeleton.bones',
          'constants.' + name + 'boneIndices',
          'variables.' + name + 'localXfos'
        ])
      }), opBindings.getLength() - 1);

      if (options.createManipulators) {
        for (i = (boneIDs.bones.length - 1); i >= 0; i--) {
          childManipulator = solver.constructManipulator(name + 'FKChainManipulator' + i, 'BoneManipulator', {
            targetNode: variablesNode.pub,
            targetMember: name + 'localXfos',
            targetMemberIndex: i,
            parentNode: rigNode.pub,
            parentMember: (i > 0 ? name + 'globalXfos' : 'pose'),
            parentMemberIndex: (i > 0 ? i - 1 : bones[boneIDs.bones[i]].parent),
            childManipulator: (options.chainManipulators ? childManipulator : undefined),
            length: bones[boneIDs.bones[i]].length,
            color: FABRIC.RT.rgb(0, 0, 1)
          });

          if (options.twistManipulators == true || options.twistManipulators[i] == true) {
            solver.constructManipulator(name + 'FKChainTwistManipulator' + i, 'RotationManipulator', {
              targetNode: variablesNode.pub,
              targetMember: name + 'localXfos',
              targetMemberIndex: i,
              parentNode: rigNode.pub,
              parentMember: (i > 0 ? name + 'globalXfos' : 'pose'),
              parentMemberIndex: (i > 0 ? i - 1 : bones[boneIDs.bones[i]].parent),
              localXfo: FABRIC.RT.xfo({
                ori: FABRIC.RT.Quat.makeFromAxisAndAngle(FABRIC.RT.vec3(0, 0, 1), - 90)
              }),
              color: FABRIC.RT.rgb(0, .5, 0),
              radius: (options.twistManipulatorRadius ?
                options.twistManipulatorRadius : bones[boneIDs.bones[i]].length * 0.25)
            });
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
    parameterBinding,
    bindToRig;

    options.identifiers = ['bone'];

    solver = FABRIC.SceneGraph.CharacterSolvers.constructSolver('CharacterSolver', options, scene);

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
            srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/solveFKHierarchy.kl',
            entryFunctionName: 'solveFKBone',
            parameterBinding: solver.setParameterBinding([
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
            bboxmin: FABRIC.RT.vec3(size * - 0.3, size * - 0.5, size * - 0.5),
            bboxmax: FABRIC.RT.vec3(size * 0.3, size * 0.5, size * 0.5)
          }),
          color: FABRIC.RT.rgb(1, 0, 0)
        });

        solver.constructManipulator(name + 'Twist', 'RotationManipulator', {
          parentNode: variablesNode.pub,
          parentMember: name + 'rootXfo',
          localXfo: FABRIC.RT.xfo({
            ori: FABRIC.RT.Quat.makeFromAxisAndAngle(FABRIC.RT.vec3(0, 0, 1), 90)
          }),
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
      globalRoot: false,
      flipUpvector: false
    });
    var solver,
    parameterBinding,
    bindToRig;

    options.identifiers = ['boneA', 'boneB', 'targetParent', 'upvectorParent'];

    solver = FABRIC.SceneGraph.CharacterSolvers.constructSolver('CharacterSolver', options, scene);

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

      if(!options.inverse){

        var localXfo = referencePose[bones[boneIDs.boneA].parent].multiplyInv(referencePose[boneIDs.boneA]);

        // compute the target
        targetPos = referencePose[boneIDs.boneB].transform(new FABRIC.RT.Vec3(bones[boneIDs.boneB].length, 0, 0));
        targetXfo = FABRIC.RT.xfo({
          tr: targetPos
        });
        if(boneIDs.targetParent != -1){
          targetXfo = referencePose[boneIDs.targetParent].multiplyInv(targetXfo);
        }
  
        // compute the upvector
        targetPos.subInPlace(referencePose[boneIDs.boneA].tr);
        lengthCenter = targetPos.unit().dot(referencePose[boneIDs.boneA].ori.getXaxis()) * bones[boneIDs.boneB].length;
        center = targetPos.unit().scale(lengthCenter).add(referencePose[boneIDs.boneA].tr);
        center.addInPlace(targetPos);
        center.addInPlace(referencePose[boneIDs.boneA].tr);
        center.mulInPlace(0.5);
  
        height = referencePose[boneIDs.boneB].tr.subtract(center);
        upvectorPos = referencePose[boneIDs.boneB].tr.add(height).add(height);
        upvector = FABRIC.RT.xfo({
          tr: upvectorPos
        });
        if(boneIDs.upvectorParent != -1){
          upvector = referencePose[boneIDs.upvectorParent].multiplyInv(upvector);
        }
  
        constantsNode.pub.addMember(name + 'boneA', 'Integer', boneIDs.boneA);
        constantsNode.pub.addMember(name + 'boneB', 'Integer', boneIDs.boneB);
        constantsNode.pub.addMember(name + 'targetParent', 'Integer', boneIDs.targetParent);
        constantsNode.pub.addMember(name + 'upvectorParent', 'Integer', boneIDs.upvectorParent);
        constantsNode.pub.addMember(name + 'flipUpvector', 'Boolean', !(!options.flipUpvector));
        constantsNode.pub.addMember(name + 'globalRoot', 'Boolean', !(!options.globalRoot));
  
        variablesNode.pub.addMember(name + 'local', 'Xfo', localXfo);
        variablesNode.pub.addMember(name + 'target', 'Xfo', targetXfo);
        variablesNode.pub.addMember(name + 'upvector', 'Xfo', upvector);
        variablesNode.pub.addMember(name + 'root', 'Xfo', referencePose[bones[boneIDs.boneA]]);

        // mark members for debugging
        solver.setDebugMember(name + 'local',bones[boneIDs.boneA].parent);
        solver.setDebugMember(name + 'target',boneIDs.targetParent);
        solver.setDebugMember(name + 'upvector',boneIDs.upvectorParent);
  
        // insert at the previous to last position to ensure that we keep the last operator
        var opBindings = rigNode.getDGNode().bindings;
        opBindings.insert(scene.constructOperator({
          operatorName: 'solveIK2Bone',
          srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/solveIK2Bone.kl',
          entryFunctionName: 'solveIK2Bone',
          parameterBinding: solver.setParameterBinding([
            'self.pose',
            'skeleton.bones',
            'constants.' + name + 'boneA',
            'constants.' + name + 'boneB',
            'constants.' + name + 'targetParent',
            'constants.' + name + 'upvectorParent',
            'constants.' + name + 'flipUpvector',
            'constants.' + name + 'globalRoot',
  
            'variables.' + name + 'local',
            'variables.' + name + 'target',
            'variables.' + name + 'upvector',
            'variables.' + name + 'root',
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
            color: options.color
          });
          solver.constructManipulator(name + 'upvectorScreen', 'ScreenTranslationManipulator', {
            targetNode: variablesNode.pub,
            targetMember: name + 'upvector',
            parentNode: rigNode.pub,
            parentMember: 'pose',
            parentMemberIndex: boneIDs['upvectorParent'],
            color: options.color
          });
        }
      }else{

        constantsNode.pub.addMember(name + 'srcBoneA', 'Integer', boneIDs.boneA);
        constantsNode.pub.addMember(name + 'srcBoneB', 'Integer', boneIDs.boneB);
        constantsNode.pub.addMember(name + 'tgtBoneA', 'Integer', solver.getInvBoneIDs().boneA);
        constantsNode.pub.addMember(name + 'tgtBoneB', 'Integer', solver.getInvBoneIDs().boneB);
        constantsNode.pub.addMember(name + 'srcTargetParent', 'Integer', boneIDs.targetParent);
        constantsNode.pub.addMember(name + 'srcUpvectorParent', 'Integer', boneIDs.upvectorParent);
        
        var opBindings = variablesNode.getDGNode().bindings;
        opBindings.append(scene.constructOperator({
          operatorName: 'solveInvIK2Bone',
          srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/solveIK2Bone.kl',
          entryFunctionName: 'solveInvIK2Bone',
          parameterBinding: solver.setParameterBinding([
            'srcrig.pose',
            'srcskeleton.bones',
            'skeleton.bones',
            'constants.' + name + 'srcBoneA',
            'constants.' + name + 'srcBoneB',
            'constants.' + name + 'tgtBoneA',
            'constants.' + name + 'tgtBoneB',
            'constants.' + name + 'srcTargetParent',
            'constants.' + name + 'srcUpvectorParent',
  
            'self.' + name + 'local',
            'self.' + name + 'target',
            'self.' + name + 'upvector',
            'self.' + name + 'root',
          ])
        }));
      }
    }
    bindToRig();

    return solver;
});

FABRIC.SceneGraph.CharacterSolvers.registerSolver('SpineSolver',
  function(options, scene) {
    scene.assignDefaults(options, {
      createBaseManipulators: true,
      manipulatorSize: undefined,
      startTangent: 0.3,
      endTangent: 0.3
    });

    var solver,
    parameterBinding,
    bindToRig;

    options.identifiers = [['vertebra'], 'end'];

    solver = FABRIC.SceneGraph.CharacterSolvers.constructSolver('CharacterSolver', options, scene);

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

      if(!options.inverse){

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
            throw ('Unexpected U value, vertebra "' + bones[boneIDs.vertebra[i]].name + '" outside of  spine.');
            }
          uValues.push(u);
        }
        uValues.push(1.0);

        constantsNode.pub.addMember(name + 'end', 'Integer', boneIDs.end);
        constantsNode.pub.addMember(name + 'vertebra', 'Integer[]', boneIDs.vertebra);
  
        constantsNode.pub.addMember(name + 'uvalues', 'Scalar[]', uValues);
        constantsNode.pub.addMember(name + 'startTangent', 'Scalar', options.startTangent);
        constantsNode.pub.addMember(name + 'endTangent', 'Scalar', options.endTangent);
  
        variablesNode.pub.addMember(name + 'startlocalXfo', 'Xfo', startlocalXfo);
        variablesNode.pub.addMember(name + 'endlocalXfo', 'Xfo', endlocalXfo);
        
        // mark members for debugging
        solver.setDebugMember(name + 'startlocalXfo',skeletonNode.getParentId(baseVertebreIndex));
        solver.setDebugMember(name + 'endlocalXfo',skeletonNode.getParentId(baseVertebreIndex));

        // insert at the previous to last position to ensure that we keep the last operator
        var opBindings = rigNode.getDGNode().bindings;
        opBindings.insert(scene.constructOperator({
          operatorName: 'solveSpine',
          srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/solveSpine.kl',
          entryFunctionName: 'solveSpine',
          parameterBinding: solver.setParameterBinding([
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
              localXfo: FABRIC.RT.xfo({
                ori: FABRIC.RT.Quat.makeFromAxisAndAngle(FABRIC.RT.vec3(0, 0, 1), 90)
              }),
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
                bboxmin: FABRIC.RT.vec3(size * - 0.3, size * - 0.5, size * - 0.5),
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
            localXfo: FABRIC.RT.xfo({
              ori: FABRIC.RT.Quat.makeFromAxisAndAngle(FABRIC.RT.vec3(0, 0, 1), 90)
            }),
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
              bboxmin: FABRIC.RT.vec3(size * - 0.3, size * - 0.5, size * - 0.5),
              bboxmax: FABRIC.RT.vec3(size * 0.3, size * 0.5, size * 0.5)
            }),
            color: FABRIC.RT.rgb(1, 0, 0)
          });
        }
      }else{
        
        // we will have different ids here
        var tgtBoneIDs = solver.getInvBoneIDs();
        constantsNode.pub.addMember(name + 'srcStart', 'Integer', boneIDs.vertebra[0]);
        constantsNode.pub.addMember(name + 'srcEnd', 'Integer', boneIDs.end);
        constantsNode.pub.addMember(name + 'tgtStart', 'Integer', tgtBoneIDs.vertebra[0]);
        constantsNode.pub.addMember(name + 'tgtEnd', 'Integer', tgtBoneIDs.end);

        // inverse computation step
        var opBindings = variablesNode.getDGNode().bindings;
        opBindings.append(scene.constructOperator({
          operatorName: 'solveInvSpine',
          srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/solveSpine.kl',
          entryFunctionName: 'solveInvSpine',
          parameterBinding: solver.setParameterBinding([
            'srcrig.pose',
            'srcskeleton.bones',
            'skeleton.bones',
            'constants.' + name + 'srcStart',
            'constants.' + name + 'srcEnd',
            'constants.' + name + 'tgtStart',
            'constants.' + name + 'tgtEnd',
            'self.' + name + 'startlocalXfo',
            'self.' + name + 'endlocalXfo'
          ])
        }));
      }
    };

    bindToRig();

    return solver;
});

FABRIC.SceneGraph.CharacterSolvers.registerSolver('TwistBoneSolver',
  function(options, scene) {

    var solver,
    parameterBinding,
    bindToRig;

    // this solver is not invertable
    if(options.inverse)
      return;

    scene.assignDefaults(options, {
      compensateEndOffset: true
    });

    options.identifiers = ['start', 'end', ['twistBones']];

    solver = FABRIC.SceneGraph.CharacterSolvers.constructSolver('CharacterSolver', options, scene);

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
      
      // compute the offset
      var endOffset = FABRIC.RT.quat();
      if(options.compensateEndOffset){
        endOffset = startXfo.projectInv(startXfo).ori;
      }

      // check if we know the U values
      var uValues = options.uValues;
      if (!uValues) {
        uValues = [];
        var boneLength = startXfo.projectInv(endXfo).tr.norm();
        for (var i = 0; i < boneIDs.twistBones.length; i++) {
          var local = startXfo.projectInv(referencePose[boneIDs.twistBones[i]]);
          var u = local.tr.norm() / boneLength;
          if (u > 1.0) {
            throw ('Unexpected U value, twistBone "' + bones[boneIDs.twistBones[i]].name + '" outside of bone.');
            }
          uValues.push(u);
        }
      }
      constantsNode.pub.addMember(name + 'start', 'Integer', boneIDs.start);
      constantsNode.pub.addMember(name + 'end', 'Integer', boneIDs.end);
      constantsNode.pub.addMember(name + 'endoffset', 'Quat', endOffset);
      constantsNode.pub.addMember(name + 'twistBones', 'Integer[]', boneIDs.twistBones);
      constantsNode.pub.addMember(name + 'uvalues', 'Scalar[]', uValues);

      // insert at the previous to last position to ensure that we keep the last operator
      var opBindings = rigNode.getDGNode().bindings;
      opBindings.insert(scene.constructOperator({
        operatorName: 'solveTwistBones',
        srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/solveTwistBones.kl',
        entryFunctionName: 'solveTwistBones',
        parameterBinding: [
          'self.pose',
          'skeleton.bones',
          'constants.' + name + 'start',
          'constants.' + name + 'end',
          'constants.' + name + 'endoffset',
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
    parameterBinding,
    bindToRig;
    
    // this solver is not invertable
    if(options.inverse)
      return;

    options.identifiers = ['start', 'end', ['blendBones']];

    solver = FABRIC.SceneGraph.CharacterSolvers.constructSolver('CharacterSolver', options, scene);

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
        var blendedXfo = referencePose[boneIDs.blendBones[i]].clone();
        blendedXfo.ori = FABRIC.RT.Quat.makeNlerp(startXfo.ori, endXfo.ori, options.blendWeights[i]);
        blendBoneOffsets.push(blendedXfo.projectInv(referencePose[boneIDs.blendBones[i]]));
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
        srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/solveTwistBones.kl',
        entryFunctionName: 'solveBlendBones',
        parameterBinding: [
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
    parameterBinding,
    bindToRig;

    // this solver is not invertable
    if(options.inverse)
      return;

    options.identifiers = ['rod'];

    solver = FABRIC.SceneGraph.CharacterSolvers.constructSolver('CharacterSolver', options, scene);

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
        throw ('Cannot solve FishingRodSolver for bone "' +
          bones[boneIDs.bones[i]].name + '", because it has length == 0.');
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
        srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/solveFishingRod.kl',
        entryFunctionName: 'fishingRodOp',
        parameterBinding: solver.setParameterBinding([
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
    parameterBinding,
    bindToRig;

    options.identifiers = [['bones'], 'targetParent'];

    solver = FABRIC.SceneGraph.CharacterSolvers.constructSolver('CharacterSolver', options, scene);

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
      targetXfo = referencePose[boneIDs.targetParent].multiplyInv(FABRIC.RT.xfo({
        tr: targetPos
      }));

      constantsNode.pub.addMember(name + 'boneIndices', 'Integer[]', boneIDs.bones);
      variablesNode.pub.addMember(name + 'target', 'Xfo', targetXfo);

      // insert at the previous to last position to ensure that we keep the last operator
      var opBindings = rigNode.getDGNode().bindings;
      opBindings.insert(scene.constructOperator({
        operatorName: 'solveNCFIK',
        srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/solveNCFIK.kl',
        entryFunctionName: 'solveNCFIK',
        parameterBinding: solver.setParameterBinding([
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
    parameterBinding,
    bindToRig;

    options.identifiers = [['bones']];

    solver = FABRIC.SceneGraph.CharacterSolvers.constructSolver('CharacterSolver', options, scene);

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
        twistManipulators.push(i != 0/*&&  i != 2 */);
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
        srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/solveLimbIK.kl',
        entryFunctionName: 'solveArmRig',
        parameterBinding: solver.setParameterBinding([
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
          localXfo: FABRIC.RT.xfo({
            ori: FABRIC.RT.Quat.makeFromAxisAndAngle(FABRIC.RT.vec3(0, 0, 1), 90)
          }),
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
            bboxmin: FABRIC.RT.vec3(size * - 0.8, size * - 0.7, size * - 0.4),
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
    parameterBinding,
    bindToRig;

    options.identifiers = [['bones']];

    solver = FABRIC.SceneGraph.CharacterSolvers.constructSolver('CharacterSolver', options, scene);

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
        srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/solveLimbIK.kl',
        entryFunctionName: 'solveLegRig',
        parameterBinding: solver.setParameterBinding([
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
          geometryNode: scene.pub.constructNode('Cross', {
            size: bones[ankleIndex].length * 0.5
          }),
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
