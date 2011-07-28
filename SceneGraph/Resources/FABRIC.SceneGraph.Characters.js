
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//

FABRIC.SceneGraph.registerNodeType('CharacterMesh', {
  factoryFn: function(options, scene) {

    options.uvSets = 1;
    options.tangentsFromUV = 0;
    options.dynamic = true;

    var characterMeshNode = scene.constructNode('Triangles', options);

    // The CharacterMesh stores aditional enveloping information.
    // These first to members sotre the values loaded from an asset
    // file like Collada.
    characterMeshNode.pub.addUniformValue('boneCountArray', 'Integer[]');
    characterMeshNode.pub.addUniformValue('boneIdsArray', 'Integer[]');
    characterMeshNode.pub.addUniformValue('boneWeightsArray', 'Scalar[]');
    characterMeshNode.pub.addVertexAttributeValue('boneIds', 'Mat33');
    characterMeshNode.pub.addVertexAttributeValue('boneWeights', 'Mat33');

    // The enveloping shader can only accept bone bindings in Mat33 values.
    // Here we take the list of bone weights, sort them, and pick the top
    // 9 weights, and re-normalize.
    characterMeshNode.getAttributesDGNode().bindings.append(scene.constructOperator({
      operatorName: 'reduceBoneBindingOp',
      srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/reduceBoneBinding.kl',
      entryFunctionName: 'reduceBoneBinding',
      parameterBinding: [
        'uniforms.boneCountArray',
        'uniforms.boneIdsArray',
        'uniforms.boneWeightsArray',
        'self.boneIds[]',
        'self.boneWeights[]'
      ]
    }));
    
    characterMeshNode.getDrawOperator = function() {
      return scene.constructOperator({
          operatorName: 'drawCharacterInstance',
          srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/drawCharacterInstance.kl',
          preProcessorDefinitions: {
            BONE_MATRICIES_ATTRIBUTE_ID: FABRIC.shaderAttributeTable.boneMatrices.id,
            MODELMATRIX_ATTRIBUTE_ID: FABRIC.shaderAttributeTable.modelMatrix.id,
            VIEWMATRIX_ATTRIBUTE_ID: FABRIC.shaderAttributeTable.viewMatrix.id,
            PROJECTIONMATRIX_ATTRIBUTE_ID: FABRIC.shaderAttributeTable.projectionMatrix.id,
            PROJECTIONMATRIXINV_ATTRIBUTE_ID: FABRIC.shaderAttributeTable.projectionMatrixInv.id,
            NORMALMATRIX_ATTRIBUTE_ID: FABRIC.shaderAttributeTable.normalMatrix.id,
            MODELVIEW_MATRIX_ATTRIBUTE_ID: FABRIC.shaderAttributeTable.modelViewMatrix.id,
            MODELVIEWPROJECTION_MATRIX_ATTRIBUTE_ID: FABRIC.shaderAttributeTable.modelViewProjectionMatrix.id
          },
          entryFunctionName: 'drawCharacterInstance',
          parameterBinding: [
            'shader.shaderProgram',
            'rig.boneMatrices',
            'camera.cameraMat44',
            'camera.projectionMat44',
            'self.indicesBufferID',
            'self.indicesCount'
          ]
        });
    }
    return characterMeshNode;
  }});

FABRIC.SceneGraph.registerNodeType('CharacterSkeleton', {
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
      calcReferenceLocalPose: false,
      calcReferenceGlobalPose: false,
      calcInvMatricies: true,
      calcReferencePoseFromInverseBindPose: false
      });

    var characterSkeletonNode = scene.constructNode('SceneGraphNode', options);
    var dgnode = characterSkeletonNode.constructDGNode('DGNode');
    dgnode.addMember('bones', 'Bone[]');
    dgnode.addMember('invmatrices', 'Mat44[]');

    // extend public interface
    characterSkeletonNode.pub.getBones = function(skeletonId) {
      return dgnode.getData('bones', skeletonId ? skeletonId : 0);
    };
    characterSkeletonNode.pub.getBone = function(boneId, skeletonId) {
      return dgnode.getData('bones', skeletonId ? skeletonId : 0)[boneId];
    };
    characterSkeletonNode.pub.getBoneIndex = function(name, skeletonId) {
      var bones = characterSkeletonNode.pub.getBones(skeletonId);
      for (var i = 0; i < bones.length; i++) {
        if (bones[i].name == name)
          return i;
      }
      return -1;
    };
    characterSkeletonNode.pub.getNumBones = function(skeletonId) {
      return characterSkeletonNode.pub.getBones().length;
    };
    characterSkeletonNode.pub.getHierarchy = function(skeletonId) {
      var result = [];
      var bones = characterSkeletonNode.pub.getBones();
      for (var i = 0; i < bones.length; i++) {
        result.push(bones[i].parent);
      }
      return result;
    };
    characterSkeletonNode.pub.getParentId = function(boneid, skeletonId) {
      return characterSkeletonNode.pub.getHierarchy(skeletonId)[boneid];
    };
    characterSkeletonNode.pub.getBoneNames = function(skeletonId) {
      var result = [];
      var bones = characterSkeletonNode.pub.getBones();
      for (var i = 0; i < bones.length; i++) {
        result.push(bones[i].name);
      }
      return result;
    };
    characterSkeletonNode.pub.getReferencePose = function(skeletonId) {
      var result = [];
      var bones = characterSkeletonNode.pub.getBones();
      for (var i = 0; i < bones.length; i++) {
        result.push(bones[i].referencePose);
      }
      return result;
    };
    characterSkeletonNode.pub.getReferenceLocalPose = function(skeletonId) {
      var result = [];
      var bones = characterSkeletonNode.pub.getBones();
      for (var i = 0; i < bones.length; i++) {
        result.push(bones[i].referenceLocalPose);
      }
      return result;
    };
    characterSkeletonNode.pub.getCount = function() {
      return dgnode.getCount();
    };
    characterSkeletonNode.pub.setCount = function(count) {
      dgnode.setCount(count);
    };
    characterSkeletonNode.pub.addBone = function(boneOptions, sliceid) {
      var bones = characterSkeletonNode.pub.getBones(),
        boneMap = {};
      for (var i = 0; i < bones.length; i++) {
        boneMap[bones[i].name] = i;
      }

      // Note: this function was very expensive because of the number of times it accessed the core.
      if (boneOptions.name === undefined || boneMap[boneOptions.name]) {
        throw ('Invalid bone name specified: ' + boneOptions.name);
      }

      if (boneOptions.parent && typeof boneOptions.parent === 'string') {
        var parentIndex = boneMap[boneOptions.parent];
        if (parentIndex == -1) {
          throw ('Bone parent ' + boneOptions.parent + ' not found in skeleton.');
        }
        boneOptions.parent = parentIndex;
      }

      // compute global from local or vice versa
      if (boneOptions.referencePose && !boneOptions.referenceLocalPose) {
        if (boneOptions.parent == -1) {
          boneOptions.referenceLocalPose = boneOptions.referencePose;
        }
        else {
          var refPose = bones[boneOptions.parent].referencePose;
          boneOptions.referenceLocalPose = refPose.projectInv(boneOptions.referencePose);
        }
      }
      else if (!boneOptions.referencePose && boneOptions.referenceLocalPose) {
        if (boneOptions.parent == -1) {
          boneOptions.referencePose = boneOptions.referenceLocalPose;
        }
        else {
          boneOptions.referencePose = bones[boneOptions.parent].referencePose.project(boneOptions.referenceLocalPose);
        }
      }

      var bone = new FABRIC.Characters.Bone(boneOptions);
      bones.push(bone);
      dgnode.setSliceBulkData(sliceid ? sliceid : 0, { bones: bones });
      return bone;
    };
    characterSkeletonNode.pub.setBones = function(boneOptions, sliceid) {
      var bones = [];
      for (var i = 0; i < boneOptions.length; i++) {
        bones.push(new FABRIC.Characters.Bone(boneOptions[i]));
      }
      dgnode.setSliceBulkData(sliceid ? sliceid : 0, { bones: bones });
    };
    characterSkeletonNode.pub.setInvMatrices = function(invmatrices) {
      dgnode.setSliceBulkData(0, { 'invmatrices': invmatrices });
    };

    if (options.calcReferencePoseFromInverseBindPose) {
      // For skeletons that are built procedurally, or using
      // our rigging tools, this operator will run every time a
      // reference pose is modified.
      dgnode.bindings.append(scene.constructOperator({
        operatorName: 'calcReferencePoseFromInverseBindPose',
        srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/characterSkeleton.kl',
        entryFunctionName: 'calcReferencePoseFromInverseBindPose',
        parameterBinding: [
          'self.bones',
          'self.invmatrices'
        ]
      }));
    }

    if (options.calcReferenceLocalPose) {
      // For skeletons that are built procedurally, or using
      // our rigging tools, this operator will run every time a
      // reference pose is modified.
      dgnode.bindings.append(scene.constructOperator({
        operatorName: 'calcReferenceLocalPose',
        srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/characterSkeleton.kl',
        entryFunctionName: 'calcReferenceLocalPose',
        parameterBinding: [
          'self.bones'
        ]
      }));
    }
    if (options.calcReferenceGlobalPose) {
      // For skeletons that are built procedurally, or using
      // our rigging tools, this operator will run every time a
      // reference pose is modified.
      dgnode.bindings.append(scene.constructOperator({
        operatorName: 'calcReferenceGlobalPose',
        srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/characterSkeleton.kl',
        entryFunctionName: 'calcReferenceGlobalPose',
        parameterBinding: [
          'self.bones'
        ]
      }));
    }
    if (options.calcInvMatricies) {
      // For skeletons that are built procedurally, or using
      // our rigging tools, this operator will run every time a
      // reference pose is modified.
      dgnode.bindings.append(scene.constructOperator({
        operatorName: 'calcInverseBindPose',
        srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/characterSkeleton.kl',
        entryFunctionName: 'calcInverseBindPose',
        parameterBinding: [
          'self.bones',
          'self.invmatrices'
        ]
      }));
    }

    return characterSkeletonNode;
  }});

FABRIC.SceneGraph.registerNodeType('CharacterSkeletonDebug', {
  factoryFn: function(options, scene) {

    scene.assignDefaults(options, {
      boneradius: 1.0,
      color: FABRIC.RT.rgba(1.0, 1.0, 1.0, 1.0),
      drawOverlayed: true
      });

    var rigNode,
      instanceNode;

    var characterSkeletonDebug = scene.constructNode('Lines', options);

    // extend public interface
    characterSkeletonDebug.pub.setRigNode = function(node) {

      rigNode = scene.getPrivateInterface(node);
      var skeletonNode = scene.getPrivateInterface(rigNode.pub.getSkeletonNode());

      characterSkeletonDebug.getAttributesDGNode().addDependency(rigNode.getDGNode(), 'rig');
      characterSkeletonDebug.getAttributesDGNode().addDependency(skeletonNode.getDGNode(), 'skeleton');
      characterSkeletonDebug.pub.addUniformValue('boneradius', 'Scalar', options.boneradius);
      characterSkeletonDebug.pub.addUniformValue('offsetpose', 'Xfo', options.offsetpose);

      // now append the operator to create the lines
      characterSkeletonDebug.getAttributesDGNode().bindings.append(scene.constructOperator({
          operatorName: 'generateSkeletonOp',
          srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/generateSkeleton.kl',
          entryFunctionName: 'generateSkeleton',
          parameterBinding: [
            'skeleton.bones',
            'rig.pose',
            'self.positions[]',
            'uniforms.indices',
            'uniforms.boneradius',
            'uniforms.offsetpose'
          ]
        }));
    };
    characterSkeletonDebug.pub.getRigNode = function() {
      return scene.getPublicInterface(rigNode);
    };

    // make sure it deforms
    characterSkeletonDebug.pub.setAttributeDynamic('positions');

    if (options.characterRigNode) {
      characterSkeletonDebug.pub.setRigNode(options.characterRigNode);
    }

    instanceNode = scene.constructNode('Instance', {
        geometryNode: characterSkeletonDebug.pub,
        materialNode: scene.constructNode('FlatMaterial', { color: options.color }).pub
      });

    // setup the postdescend operators for disable and enable zbuffer
    // PT - This could be done at the shader/material stage
    if (options.drawOverlayed) {
      instanceNode.getRedrawEventHandler().preDescendBindings.insert(scene.constructOperator({
          operatorName: 'disableZBuffer',
          srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/drawAttributes.kl',
          entryFunctionName: 'disableZBuffer',
          parameterBinding: []
        }), 0);
      instanceNode.getRedrawEventHandler().postDescendBindings.append(scene.constructOperator({
          operatorName: 'popAttribs',
          srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/drawAttributes.kl',
          entryFunctionName: 'popAttribs',
          parameterBinding: []
        }));
    }
    return characterSkeletonDebug;
  }});


FABRIC.SceneGraph.registerNodeType('CharacterVariables', {
  factoryFn: function(options, scene) {

    var characterVariablesNode = scene.constructNode('SceneGraphNode', options);
    var dgnode = characterVariablesNode.constructDGNode('DGNode');

    // extend the private interface
    characterVariablesNode.pub.addMember = function(name, type, value) {
      dgnode.addMember(name, type, value);
    };
    characterVariablesNode.pub.getData = function(name, index) {
      var value = dgnode.getData(name, 0);
      if (index != undefined) {
        value = value[index];
      }
      return value;
    };
    characterVariablesNode.pub.setData = function(name, value, index) {
      var newValue;
      if (index != undefined) {
        newValue = dgnode.getData(name, 0);
        newValue[index] = value;
      }
      else {
        newValue = value;
      }
      dgnode.setData(name, 0, newValue);
    };

    return characterVariablesNode;
  }});

  /*
// TODO: Come back to this one.

// This node represents a branch in an animation graph
// Where multiple rig input values are being blended together
FABRIC.SceneGraph.registerNodeType("NLerpCharacterVariables", {
  factoryFn: function(options, scene){
    scene.assignDefaults(options, {
      });
    var rigVariablesNode = scene.constructNode("RigVariables");
    rigVariablesNode.getDGNode().bindings.append(scene.constructOperator(
      {
        operatorName:"lerpRigVariablesOp",
        srcFile:"../../../SceneGraph/Resources/KL/lerpRigVariables.kl",
        entryFunctionName:"lerpRigVariables",
        parameterBinding:[
          "self.time",
          "input1.rigparams",
          "input2.rigparams",
          "self.rigparams"
        ]
      }));
    var numInputs = 0;
    rigVariablesNode.addInput = function(node){
        if(node.supertype !== "RigVariables"){
          throw("Incorrect type assignment. Must assign a RigVariables");
        }
        rigVariablesNode.getDGNode().addDependency(node.getDGNode(), "input" + numInputs);
        skeletonNode = node;
      };
    return rigVariablesNode;
  }});
  */

// These are the values that represent the evaluation
// algorithm for this character instance.
//
//
FABRIC.SceneGraph.registerNodeType('CharacterConstants', {
  factoryFn: function(options, scene) {

    var characterConstantsNode = scene.constructNode('CharacterVariables', options);
    return characterConstantsNode;
  }});

// The character rig computes the pose of a character
FABRIC.SceneGraph.registerNodeType('CharacterRig', {
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
      });

    if (!options.skeletonNode) {
      throw ('skeletonNode must be specified.');
    }

    var characterRigNode = scene.constructNode('SceneGraphNode', options);
    var dgnode = characterRigNode.constructDGNode('DGNode');
    var skeletonNode,
      variablesNode,
      constantsNode,
      solvers = [];

    // extend the public interface
    characterRigNode.pub.getPose = function() {
      dgnode.evaluate();
      return dgnode.getData('pose');
    };
    characterRigNode.pub.getSkeletonNode = function() {
      return scene.getPublicInterface(skeletonNode);
    };
    characterRigNode.pub.setVariablesNode = function(node) {
      if (!node || !node.isTypeOf('CharacterVariables')) {
        throw ('Incorrect type assignment. Must assign a CharacterVariables');
      }
      node = scene.getPrivateInterface(node);
      dgnode.addDependency(node.getDGNode(), 'variables');
      variablesNode = node;
    };
    characterRigNode.pub.getVariablesNode = function() {
      return scene.getPublicInterface(variablesNode);
    };
    characterRigNode.pub.setConstantsNode = function(node) {
      if (!node.isTypeOf('CharacterConstants')) {
        throw ('Incorrect type assignment. Must assign a CharacterConstants');
      }
      node = scene.getPrivateInterface(node);
      dgnode.addDependency(node.getDGNode(), 'constants');
      constantsNode = node;
    };
    characterRigNode.pub.getConstantsNode = function() {
      return scene.getPublicInterface(constantsNode);
    };
    //////////////////////////////////////////
    // Solver Interfaces
    characterRigNode.pub.addSolver = function(name, type, solverOptions) {
      solverOptions = scene.assignDefaults(solverOptions, {
        rigNode: characterRigNode.pub,
        index: solvers.length
      });
      for (var i = 0; i < solvers.length; i++) {
        if (solvers[i].name == name) {
          throw (" Solver names must be unique. Solver '" + name +
                 "' already applied to :" + characterRigNode.pub.getName());
        }
      }
      solverOptions.name = name;
      var solver = FABRIC.SceneGraph.CharacterSolvers.createSolver(type, solverOptions, scene);
      solvers.push(solver);
      return solver;
    };
    characterRigNode.pub.getSolvers = function() {
      return solvers;
    };
    //////////////////////////////////////////
    characterRigNode.pub.addMember = function(name, type, value) {
      dgnode.addMember(name, type, value);
    };
    characterRigNode.pub.getData = function(name, index) {
      var xfo = dgnode.getData(name, 0);
      if (index != undefined) {
        xfo = xfo[index];
      }
      return xfo;
    };
    characterRigNode.pub.setData = function(name, value, index) {
      var xfo;
      if (index != undefined) {
        xfo = dgnode.getData(name, 0);
        xfo[index] = value;
      }
      else {
        xfo = value;
      }
      dgnode.setData(name, 0, xfo);
    }

    // Assign the skeleton and initialize the values.
    var setSkeletonNode = function(node) {
      if (!node.isTypeOf('CharacterSkeleton')) {
        throw ('Incorrect type assignment. Must assign a CharacterSkeleton');
      }
      node = scene.getPrivateInterface(node);

      dgnode.addDependency(node.getDGNode(), 'skeleton');
      skeletonNode = node;

      // This member will store the computed pose.
      var referencePose = skeletonNode.pub.getReferencePose();
      dgnode.addMember('pose', 'Xfo[]', referencePose);
      dgnode.addMember('boneMatrices', 'Mat44[]');

      // create the operators that converts the pose to matrices
      dgnode.bindings.append(scene.constructOperator({
          operatorName: 'calcSkinningMatrices',
          srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/characterRig.kl',
          entryFunctionName: 'calcSkinningMatrices',
          parameterBinding: ['self.pose', 'skeleton.invmatrices', 'self.boneMatrices']
        }));
    }
    setSkeletonNode(options.skeletonNode);

    if (options.variablesNode) {
      characterRigNode.pub.setVariablesNode(options.variablesNode);
    }
    else {
      characterRigNode.pub.setVariablesNode(scene.constructNode('CharacterVariables').pub);
    }

    if (options.constantsNode) {
      characterRigNode.pub.setConstantsNode(options.constantsNode);
    }
    else {
      characterRigNode.pub.setConstantsNode(scene.constructNode('CharacterConstants').pub);
    }
    return characterRigNode;
  }});



// The character rig computes the pose of a character
FABRIC.SceneGraph.registerNodeType('FKCharacterRig', {
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
      });


  }});

// The character rig computes the pose of a character
FABRIC.SceneGraph.registerNodeType('GlobalCharacterRig', {
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
      });

    var globalCharacterRigNode = scene.constructNode('CharacterRig', options);
    globalCharacterRigNode.pub.addSolver('solveGlobalPose', 'ReferencePoseSolver');
    return globalCharacterRigNode;
  }});

FABRIC.SceneGraph.registerNodeType('CharacterRigDebug', {
  factoryFn: function(options, scene) {

    scene.assignDefaults(options, {
      dynamic: true,
      color: FABRIC.RT.rgba(0.0, 1.0, 1.0, 1.0),
      size: 5.0,
      offsetpose: FABRIC.RT.xfo(),
      constructInstanceNode: true
      });

    var characterRigDebugNode = scene.constructNode('Points', options);
    var rigNode,
      instanceNode;

    // extend public interface
    characterRigDebugNode.pub.setRigNode = function(node) {

      rigNode = scene.getPrivateInterface(node);

      characterRigDebugNode.pub.addVertexAttributeValue('vertexColors', 'Color');
      characterRigDebugNode.getUniformsDGNode().addDependency(rigNode.getDGNode(), 'rig');
      characterRigDebugNode.getUniformsDGNode().addDependency(rigNode.getConstantsNode().getDGNode(), 'constants');
      characterRigDebugNode.getUniformsDGNode().addDependency(rigNode.getVariablesNode().getDGNode(), 'variables');
      characterRigDebugNode.pub.addUniformValue('debugpose', 'Xfo[]');
      characterRigDebugNode.pub.addUniformValue('singlecolor', 'Color', options.color);
      characterRigDebugNode.pub.addUniformValue('offsetpose', 'Xfo', options.offsetpose);

      // now append the operator to create the lines
      var operators = characterRigDebugNode.getUniformsDGNode().bindings;
      operators.append(scene.constructOperator(
        {
          operatorName: 'clearDebugXfos',
          srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/characterDebug.kl',
          entryFunctionName: 'clearDebugXfos',
          parameterBinding: [
            'self.debugpose'
          ]
        }));

    //  var debugOperators = rigNode.getConstantsNode().getDebugOperators();
    //  for(var i=0;i<debugOperators.length;i++)
    //    operators.append(debugOperators[i]);

      characterRigDebugNode.getAttributesDGNode().bindings.append(scene.constructOperator({
          operatorName: 'generateDebugPoints',
          srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/characterDebug.kl',
          entryFunctionName: 'generateDebugPoints',
          parameterBinding: [
            'uniforms.debugpose',
            'uniforms.offsetpose',
            'self.positions[]',
            'self.vertexColors[]',
            'uniforms.singlecolor'
          ]
        }));
    };
    characterRigDebugNode.pub.getRigNode = function() {
      return rigNode;
    };
    characterRigDebugNode.pub.constructInstanceNode = function() {
      if (instanceNode)
        return instanceNode;
      if (!rigNode)
        return undefined;

      var material = scene.constructNode('VertexColorMaterial', {
        prototypeMaterialType: 'PointMaterial',
        pointSize: 10.0,
        color: FABRIC.RT.rgb(0.8, 0, 0, 1)
      });

      instanceNode = scene.constructNode('Instance', {
          geometryNode: characterRigDebugNode.pub,
          materialNode: material
        });
      return instanceNode;
    };
    characterRigDebugNode.pub.getInstanceNode = function() {
      return scene.getPublicInterface(instanceNode);
    };

    characterRigDebugNode.pub.characterRigDebugNode.setAttributeDynamic('positions');

    if (options.characterRigNode) {
      characterRigDebugNode.pub.setRigNode(options.characterRigNode);
    }
    if (options.constructInstanceNode) {
      characterRigDebugNode.pub.constructInstanceNode();
    }

    return characterRigDebugNode;
  }});

// The character instance draws a deformed mesh on screen.
FABRIC.SceneGraph.registerNodeType('CharacterInstance', {
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
      });

    var characterInstanceNode = scene.constructNode('Instance', options);
    var rigNode;

    // Ensure that a transform node is not assigned.
    delete options.transformNode;
    options.constructDefaultTransformNode = false;

    // extend public interface
    characterInstanceNode.pub.setRigNode = function(node) {
      if (!node.isTypeOf('CharacterRig')) {
        throw ('Incorrect type assignment. Must assign a CharacterRig');
      }
      rigNode = scene.getPrivateInterface(node);
      characterInstanceNode.getRedrawEventHandler().addScope('rig', rigNode.getDGNode());
    };
    characterInstanceNode.pub.getRigNode = function() {
      return scene.getPublicInterface(rigNode);
    };
    var parentSetGeometryNode = characterInstanceNode.pub.setGeometryNode;
    characterInstanceNode.pub.setGeometryNode = function(node) {
      if (!node.isTypeOf('CharacterMesh')) {
        throw ('Incorrect type assignment. Must assign a CharacterMesh.');
      }
      parentSetGeometryNode(node);
    };
    characterInstanceNode.pub.getTransformNode = function() {
    };
    characterInstanceNode.pub.setTransformNode = function(node, member) {
      throw 'Character Instance does not support the transformNode';
    };

    if (options.rigNode) {
      characterInstanceNode.pub.setRigNode(options.rigNode);
    }
    return characterInstanceNode;
  }});

