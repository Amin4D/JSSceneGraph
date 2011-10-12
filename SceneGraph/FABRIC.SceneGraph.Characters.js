
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//

FABRIC.SceneGraph.registerNodeType('CharacterMesh', {
  briefDesc: 'The CharacterMesh node represents a deformable Triangles node.',
  detailedDesc: 'The CharacterMesh node represents a deformable Triangles node. It is typically deformed through a GLSL skinning operator, driven by a CharacterRig node.',
  parentNodeDesc: 'Triangles',
  optionsDesc: {
  },
  factoryFn: function(options, scene) {

    var characterMeshNode = scene.constructNode('Triangles', options);
    
    characterMeshNode.pub.addVertexAttributeValue('boneIds', 'Vec4', { genVBO:true } );
    characterMeshNode.pub.addVertexAttributeValue('boneWeights', 'Vec4', { genVBO: true });
    
    characterMeshNode.pub.addUniformValue('invmatrices', 'Mat44[]');
    characterMeshNode.pub.addUniformValue('boneMapping', 'Integer[]');
    
    characterMeshNode.getRedrawEventHandler().preDescendBindings.append( scene.constructOperator({
      operatorName: 'loadSkinningMatrices',
      srcFile: 'FABRIC_ROOT/SceneGraph/KL/loadSkinningMatrices.kl',
      preProcessorDefinitions: {
        SKINNING_MATRICES_ATTRIBUTE_ID: FABRIC.SceneGraph.getShaderParamID('skinningMatrices')
      },
      entryFunctionName: 'loadSkinningMatrices',
      parameterLayout: [
        'shader.shaderProgram',
        'rig.pose',
        'uniforms.invmatrices',
        'uniforms.boneMapping',
        'self.indicesBuffer',
        'instance.drawToggle'
      ]
    }));
    
    characterMeshNode.pub.setInvMatrices = function(invmatrices, boneMapping) {
      characterMeshNode.getUniformsDGNode().setData('invmatrices', 0, invmatrices);
      characterMeshNode.getUniformsDGNode().setData('boneMapping', 0, boneMapping);
    };
    
    return characterMeshNode;
  }});

FABRIC.SceneGraph.registerNodeType('CharacterSkeleton', {
  briefDesc: 'The CharacterSkeleton node represents a collection of bones forming a skeleton.',
  detailedDesc: 'The CharacterSkeleton node represents a collection of bones forming a skeleton. It defines the rest pose of a character, as well as all related settings.',
  parentNodeDesc: 'SceneGraphNode',
  optionsDesc: {
    calcReferenceLocalPose: 'Set to true, this will enable to computation of the local reference pose based on the global one.',
    calcReferenceGlobalPose: 'Set to true, this will enable to computation of the global reference pose based on the local one.'
  },
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
      calcReferenceLocalPose: false,
      calcReferenceGlobalPose: false
    });

    var characterSkeletonNode = scene.constructNode('SceneGraphNode', options);
    var dgnode = characterSkeletonNode.constructDGNode('DGNode');
    dgnode.addMember('bones', 'Bone[]');

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
    characterSkeletonNode.pub.addBone = function(boneOptions, skeletonId) {
      var bones = characterSkeletonNode.pub.getBones(),
        boneMap = {};
      for (var i = 0; i < bones.length; i++) {
        boneMap[bones[i].name] = i;
      }
      
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
        if (!boneOptions.parent || boneOptions.parent == -1) {
          boneOptions.referenceLocalPose = boneOptions.referencePose;
        }
        else {
          var refPose = bones[boneOptions.parent].referencePose;
          boneOptions.referenceLocalPose = refPose.inverse().multiply(boneOptions.referencePose);
        }
      }
      else if (!boneOptions.referencePose && boneOptions.referenceLocalPose) {
        if (boneOptions.parent == -1) {
          boneOptions.referencePose = boneOptions.referenceLocalPose;
        }
        else {
          boneOptions.referencePose = boneOptions.referenceLocalPose.multiply(bones[boneOptions.parent].referencePose);
        }
      }

      var bone = new FABRIC.Characters.Bone(boneOptions);
      bones.push(bone);
      dgnode.setData('bones', skeletonId ? skeletonId : 0, bones );
      return bone;
    };
    
    characterSkeletonNode.pub.setBones = function(boneOptions, skeletonId) {
      var bones = [];
      for (var i = 0; i < boneOptions.length; i++) {
        bones.push(new FABRIC.Characters.Bone(boneOptions[i]));
      }
      dgnode.setData('bones', skeletonId ? skeletonId : 0, bones );
    };

    if (options.calcReferenceLocalPose) {
      // For skeletons that are built procedurally, or using
      // our rigging tools, this operator will run every time a
      // reference pose is modified.
      dgnode.bindings.append(scene.constructOperator({
        operatorName: 'calcReferenceLocalPose',
        srcFile: 'FABRIC_ROOT/SceneGraph/KL/characterSkeleton.kl',
        entryFunctionName: 'calcReferenceLocalPose',
        parameterLayout: [
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
        srcFile: 'FABRIC_ROOT/SceneGraph/KL/characterSkeleton.kl',
        entryFunctionName: 'calcReferenceGlobalPose',
        parameterLayout: [
          'self.bones'
        ]
      }));
    }

    return characterSkeletonNode;
  }});

FABRIC.SceneGraph.registerNodeType('CharacterSkeletonDebug', {
  briefDesc: 'The CharacterSkeletonDebug node is a debug node used to draw a CharacterSkeletonNode on screen.',
  detailedDesc: 'The CharacterSkeletonDebug node is a debug node used to draw a CharacterSkeletonNode on screen. It generates a collection of line segments for each bone in the skeleton.',
  parentNodeDesc: 'Lines',
  optionsDesc: {
    boneradius: 'The radius of the bones to use for drawing.',
    color: 'The color of the lines to use for drawing.',
    drawOverlayed: 'Set to true, this will enable overlayed drawing for the CharacterSkeletonDebug node.'
  },
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

      characterSkeletonDebug.getAttributesDGNode().setDependency(rigNode.getDGNode(), 'rig');
      characterSkeletonDebug.getAttributesDGNode().setDependency(skeletonNode.getDGNode(), 'skeleton');
      characterSkeletonDebug.pub.addUniformValue('boneradius', 'Scalar', options.boneradius);
      characterSkeletonDebug.pub.addUniformValue('offsetpose', 'Xfo', options.offsetpose);

      // now append the operator to create the lines
      
      // now append the operator to create the lines
      characterSkeletonDebug.getAttributesDGNode().bindings.append(scene.constructOperator({
          operatorName: 'setSkeletonVertexCount',
          srcFile: 'FABRIC_ROOT/SceneGraph/KL/generateSkeleton.kl',
          entryFunctionName: 'setSkeletonVertexCount',
          parameterLayout: [
            'skeleton.bones',
            'self.newCount'
          ]
        }));
      
      characterSkeletonDebug.getAttributesDGNode().bindings.append(scene.constructOperator({
          operatorName: 'generateSkeletonOp',
          srcFile: 'FABRIC_ROOT/SceneGraph/KL/generateSkeleton.kl',
          entryFunctionName: 'generateSkeleton',
          parameterLayout: [
            'skeleton.bones',
            'rig.pose',
            'self.positions<>',
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
        materialNode: scene.constructNode('FlatMaterial', {
          color: options.color,
          drawOverlayed: options.drawOverlayed
        }).pub
      });
    characterSkeletonDebug.pub.getInstanceNode = function() {
      return instanceNode.pub;
    }

    return characterSkeletonDebug;
  }});


FABRIC.SceneGraph.registerNodeType('CharacterVariables', {
  briefDesc: 'The CharacterVariables node is a collection of all parameters used for a pose computation.',
  detailedDesc: 'The CharacterVariables node is a collection of all parameters used for a pose computation. The members in this node are typically changing over time, for example they are based on FCurve animation.',
  parentNodeDesc: 'SceneGraphNode',
  optionsDesc: {
  },
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


// These are the values that represent the evaluation
// algorithm for this character instance.
// Note: Do we need different node types for CharacterVariables and CharacterConstants?
// The 'CharacterConstants' adds nothing to the variables. We could generalise them to
// 'CharacterParameters' and use the same node type for Constants and Variables. 
FABRIC.SceneGraph.registerNodeType('CharacterConstants', {
  briefDesc: 'The CharacterConstants node is similar to a CharacterVariables node, but values don\'t change over time.',
  detailedDesc: 'The CharacterConstants node is similar to a CharacterVariables node, but values don\'t change over time.',
  parentNodeDesc: 'CharacterVariables',
  optionsDesc: {
  },
  factoryFn: function(options, scene) {

    var characterConstantsNode = scene.constructNode('CharacterVariables', options);
    return characterConstantsNode;
  }});


// The character rig computes the pose of a character
FABRIC.SceneGraph.registerNodeType('CharacterRig', {
  briefDesc: 'The CharacterRig node is used to compute the pose of a character.',
  detailedDesc: 'The CharacterRig node is used to compute the pose of a character. It utilizes the CharacterSkeleton as well as the CharacterVariables node, ' +
                'together with a series of operators, called CharacterSolvers, to compute the global pose of the character.',
  parentNodeDesc: 'SceneGraphNode',
  optionsDesc: {
    skeletonNode: 'The skeletonNode to use for this CharacterRig',
    computeInverseXfos: 'Determines if the inverse transforms should be computes based on the CharacterSkeleton\'s reference pose.'
  },
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
        skeletonNode: undefined,
        computeInverseXfos: false
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
    characterRigNode.addMemberInterface(dgnode, 'pose', true);
    
    var setSkeletonNode = function(node) {
      if (!node.isTypeOf('CharacterSkeleton')) {
        throw ('Incorrect type assignment. Must assign a CharacterSkeleton');
      }
      node = scene.getPrivateInterface(node);

      dgnode.setDependency(node.getDGNode(), 'skeleton');
      skeletonNode = node;

      // This member will store the computed pose.
      var referencePose = skeletonNode.pub.getReferencePose();
      dgnode.addMember('pose', 'Xfo[]', referencePose);

    }
    characterRigNode.pub.getSkeletonNode = function() {
      return scene.getPublicInterface(skeletonNode);
    };

    characterRigNode.pub.setVariablesNode = function(node) {
      if (!node || !node.isTypeOf('CharacterVariables')) {
        throw ('Incorrect type assignment. Must assign a CharacterVariables');
      }
      node = scene.getPrivateInterface(node);
      dgnode.setDependency(node.getDGNode(), 'variables');
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
      dgnode.setDependency(node.getDGNode(), 'constants');
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
    var numSolverOperators = 0;
    characterRigNode.addSolverOperator = function(operator) {
      dgnode.bindings.insert(operator, numSolverOperators);
      numSolverOperators++;
    }
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



FABRIC.SceneGraph.registerNodeType('CharacterRigDebug', {
  briefDesc: 'The CharacterRigDebug node is used to draw debug information of a CharacterRig on screen.',
  detailedDesc: 'The CharacterRigDebug node is used to draw debug information of a CharacterRig on screen.',
  parentNodeDesc: 'Points',
  optionsDesc: {
  },
  factoryFn: function(options, scene) {

    scene.assignDefaults(options, {
      dynamic: true,
      color: FABRIC.RT.rgba(0.0, 1.0, 1.0, 1.0),
      size: 5.0,
      offsetpose: new FABRIC.RT.Xfo(),
      constructInstanceNode: true
      });

    var characterRigDebugNode = scene.constructNode('Points', options);
    var rigNode,
      instanceNode;

    // extend public interface
    characterRigDebugNode.pub.setRigNode = function(node) {

      rigNode = scene.getPrivateInterface(node);

      characterRigDebugNode.pub.addVertexAttributeValue('vertexColors', 'Color', { genVBO:true } );
      characterRigDebugNode.getUniformsDGNode().setDependency(rigNode.getDGNode(), 'rig');
      characterRigDebugNode.getUniformsDGNode().setDependency(rigNode.getConstantsNode().getDGNode(), 'constants');
      characterRigDebugNode.getUniformsDGNode().setDependency(rigNode.getVariablesNode().getDGNode(), 'variables');
      characterRigDebugNode.pub.addUniformValue('debugpose', 'Xfo[]');
      characterRigDebugNode.pub.addUniformValue('singlecolor', 'Color', options.color);
      characterRigDebugNode.pub.addUniformValue('offsetpose', 'Xfo', options.offsetpose);

      // now append the operator to create the lines
      var operators = characterRigDebugNode.getUniformsDGNode().bindings;
      operators.append(scene.constructOperator(
        {
          operatorName: 'clearDebugXfos',
          srcFile: 'FABRIC_ROOT/SceneGraph/KL/characterDebug.kl',
          entryFunctionName: 'clearDebugXfos',
          parameterLayout: [
            'self.debugpose'
          ]
        }));

    //  var debugOperators = rigNode.getConstantsNode().getDebugOperators();
    //  for(var i=0;i<debugOperators.length;i++)
    //    operators.append(debugOperators[i]);

      characterRigDebugNode.getAttributesDGNode().bindings.append(scene.constructOperator({
          operatorName: 'generateDebugPoints',
          srcFile: 'FABRIC_ROOT/SceneGraph/KL/characterDebug.kl',
          entryFunctionName: 'generateDebugPoints',
          parameterLayout: [
            'uniforms.debugpose',
            'uniforms.offsetpose',
            'self.positions<>',
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
  briefDesc: 'The CharacterInstance node is used to draw a deformed CharacterMesh on screen.',
  detailedDesc: 'The CharacterInstance node is used to draw a deformed CharacterMesh on screen. It utilizes the CharacterRig as well as the CharacterMesh, and applies skinning / deformation through the use of GLSL.',
  parentNodeDesc: 'Instance',
  optionsDesc: {
  },
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
      });

    var characterInstanceNode = scene.constructNode('Instance', options);
    var rigNode;

    // extend public interface
    characterInstanceNode.pub.setRigNode = function(node) {
      if (!node.isTypeOf('CharacterRig')) {
        throw ('Incorrect type assignment. Must assign a CharacterRig');
      }
      rigNode = scene.getPrivateInterface(node);
      characterInstanceNode.getRedrawEventHandler().setScope('rig', rigNode.getDGNode());
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

