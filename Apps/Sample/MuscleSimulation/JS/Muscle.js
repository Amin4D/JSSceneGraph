
/*
FABRIC.SceneGraph.defineEffectFromFile('MuscleCoreLineShader', './Shaders/MuscleCoreLineShader.xml');
FABRIC.SceneGraph.defineEffectFromFile('MuscleVolumeShader', './Shaders/MuscleVolumeShader.xml');
*/

// These Node definitions are inlined for now, but will
// be moved to a separate file once they are stabilized. 
FABRIC.SceneGraph.registerNodeType('MuscleSystem', {
  factoryFn: function(options, scene) {
    options = scene.assignDefaults(options, {
      characterRig: undefined,
      volumeConstraintMesh: undefined,
      gravity: FABRIC.RT.vec3(0, -0.1, 0),
      numRelaxationIterations: 6,
      displacementMapResolution: 32
      });
    var muscleSystem = scene.constructNode('SceneGraphNode', options ),
      dgnode = muscleSystem.constructDGNode('DGNode'),
      i;
      
    dgnode.addMember('gravity', 'Vec3', options.gravity);
    dgnode.addMember('numRelaxationIterations', 'Size', options.numRelaxationIterations);
    dgnode.addMember('displacementMapResolution', 'Size', options.displacementMapResolution);
    
    
    //////////////////////////////////////////////////////////
    // Volume Display
    var volumeDisplayNode = scene.constructNode('Cylinder', {
        radius: 0.5,
        height: 1.0,
        sides: options.displacementMapResolution,
        loops: options.displacementMapResolution,
        caps: true
      });
    
    volumeDisplayNode.getAttributesDGNode().bindings.append(
      scene.constructOperator({
        operatorName: 'rotateMuscleVolume',
        srcCode: '\n\
use Quat;\n\
use Vec3;\n\
operator rotateMuscleVolume(\n\
  io Vec3 position\n\
) {\n\
  Scalar PI = 3.141592653589793238462643383279;\n\
  position = axisAndAngleToQuat(Vec3(0.0,0.0,1.0), PI*-0.5).rotateVector(position);\n\
}\n\
        ',
        entryFunctionName: 'rotateMuscleVolume',
        parameterLayout: [
          'self.positions'
        ]
      }));
    muscleSystem.getVolumeDisplayNode = function(){
      return volumeDisplayNode.pub;
    }
    
    
    //////////////////////////////////////////////////////////
    // Muscles
    var muscles = scene.constructNode('Muscle', {
        muscleSystem: muscleSystem,
        characterRig: scene.getPrivateInterface(options.characterRig)
      });
    
    muscleSystem.setVolumeConstraintMesh = function(mesh){
      dgnode.addBinding( mesh, 'constraintMesh');
      dgnode.addMember('volumeConstraintMesh', 'TriangleMesh');
    }
    /*
    var corePositionsID = FABRIC.SceneGraph.getShaderParamID('corePositions');
    var loadCorePositionsOp = scene.constructOperator({
        operatorName: 'loadMuscleCorePositions',
        srcCode: '\n\
operator loadUniform(\n\
  io OGLShaderProgram shaderProgram,\n\
  io Mat44 values[]\n\
) {\n\
  Integer location = shaderProgram.getUniformLocation('+corePositionsID+');\n\
//  report("Loading corePositions :"+location + " = "+values);\n\
  if(location!=-1){\n\
    shaderProgram.loadMat44UniformArray(location, values);\n\
  }\n\
}\n\
        ',
        entryFunctionName: 'loadUniform',
        parameterLayout: [
          'shader.shaderProgram',
          'muscles.cvPositions[]'
        ]
      });
    
    var coreFramesID = FABRIC.SceneGraph.getShaderParamID('coreFrames');
    var loadCoreFramesOp = scene.constructOperator({
        operatorName: 'loadMuscleCoreFrames',
        srcCode: '\n\
operator loadUniform(\n\
  io OGLShaderProgram shaderProgram,\n\
  io Mat44 values[]\n\
) {\n\
  Integer location = shaderProgram.getUniformLocation('+coreFramesID+');\n\
//  report("Loading coreFrames :"+location + " = "+values);\n\
  if(location!=-1){\n\
    shaderProgram.loadMat44UniformArray(location, values);\n\
  }\n\
}\n\
        ',
        entryFunctionName: 'loadUniform',
        parameterLayout: [
          'shader.shaderProgram',
          'muscles.cvFrames[]'
        ]
      })
    
    var light = scene.constructNode('PointLight', { position: FABRIC.RT.vec3(420.0, 1000.0, 600.0) });
    //////////////////////////////////////////////////////////
    // Lines Display
    var coreDisplayLinesNode = scene.constructNode('LineStrip');
    coreDisplayLinesNode.getAttributesDGNode().addDependency(dgnode, 'musclesystem');
    coreDisplayLinesNode.setGeneratorOps([
      scene.constructOperator({
        operatorName: 'setMuscleCoreLinesDisplayVertexCount',
        srcFile: './KL/MuscleRendering.kl',
        entryFunctionName: 'setMuscleCoreLinesDisplayVertexCount',
        parameterLayout: [
          'musclesystem.displacementMapResolution',
          'self.newCount'
        ]
      }),
      scene.constructOperator({
        operatorName: 'generateMuscleCoreLine',
        srcFile: './KL/MuscleRendering.kl',
        entryFunctionName: 'generateMuscleCoreLine',
        parameterLayout: [
          'self.positions[]',
          'uniforms.indices'
        ]
      })
    ]);
    
    var redrawEventHandler = coreDisplayLinesNode.getRedrawEventHandler();
    redrawEventHandler.addScope('muscles', muscles.getSimulationDGNode());
    redrawEventHandler.preDescendBindings.append(loadCorePositionsOp);
    redrawEventHandler.preDescendBindings.append(loadCoreFramesOp);
    
    var linesInst = scene.constructNode('Instance', {
      geometryNode: coreDisplayLinesNode.pub,
      materialNode: scene.constructNode('MuscleCoreLineShader', {
        diffuseColor: FABRIC.RT.rgb(0.2, 0.0, 0.0),
        pointSize: 6,
        numMuscles: 1
      }).pub
    });
    */
    muscleSystem.getMuscles = function(){
      return muscles;
    }
    muscleSystem.addMuscle = function( muscleOptions ){
      muscles.addMuscle( muscleOptions );
    }
    
    return muscleSystem;
  }});
     
     
FABRIC.SceneGraph.registerNodeType('Muscle', {
  factoryFn: function(options, scene) {
    options = scene.assignDefaults(options, {
      numSegments: 7,
      length: 10,
      muscleSystem: undefined,
      characterRig: undefined,
      display: true,
      xfo: FABRIC.RT.xfo(),
      pointEnvelopeIds: FABRIC.RT.vec2(0,1)
    });
    
    var muscleSystem = options.muscleSystem,
      muscle = scene.constructNode('SceneGraphNode', options ),
      initializationdgnode = muscle.constructDGNode('InitializationDGNode'),
      simulationdgnode = muscle.constructDGNode('SimulationDGNode'),
      i;
      
    initializationdgnode.addDependency( muscleSystem.getDGNode(), 'musclesystem');
    simulationdgnode.addDependency( muscleSystem.getDGNode(), 'musclesystem');
    simulationdgnode.addDependency( initializationdgnode, 'initializationdgnode');
    
    var characterRig = options.characterRig;
    simulationdgnode.addDependency( characterRig.getDGNode(), 'characterRig');
    simulationdgnode.addDependency( scene.getGlobalsNode(), 'globals');
    
    var pointXfos = [],
      segmentLengths = [],
      pointEnvelopWeights = [],
      segmentCompressionFactors = [],
      flexibilityWeights = [],
      contractionWeights = [],
      simulationWeights= [],
      pointPositions = [];
      
    for(i = 0; i < options.numSegments; i++){
      pointXfos.push(FABRIC.RT.xfo( {
        tr: FABRIC.RT.vec3( ((i/(options.numSegments-1)) - 0.5) * options.length, 0,0)
      }));
      var envelopWeight = (Math.cos((i/(options.numSegments-1)) * Math.PI) + 1) * 0.5;
      pointEnvelopWeights.push(FABRIC.RT.vec2(envelopWeight, 1.0 - envelopWeight));
      
      var flexibilityWeight = (Math.cos((i/(options.numSegments-1) * 2.0 * Math.PI)) * 0.45) + 0.55;
      flexibilityWeights.push(1.0 - Math.pow(flexibilityWeight, 4));
      pointPositions.push(pointXfos[i].tr);
      segmentCompressionFactors.push(1.0);
      if(i>0){
        segmentLengths.push(pointXfos[i].tr.dist(pointXfos[i-1].tr));
        contractionWeights.push((flexibilityWeights[i]+flexibilityWeights[i-1]) * 0.5 );
      }
    }
    
    initializationdgnode.addMember('initialXfos', 'Xfo[]', pointXfos); / * Xfos deformed by the skeleton * /
    initializationdgnode.addMember('baseXfo', 'Xfo', options.xfo); / * Xfos deformed by the skeleton * /
    initializationdgnode.addMember('segmentLengths', 'Scalar[]', segmentLengths);
      
    initializationdgnode.addMember('pointEnvelopeIds', 'Vec2', options.pointEnvelopeIds);
    initializationdgnode.addMember('pointEnvelopWeights', 'Vec2[]', pointEnvelopWeights);
    initializationdgnode.addMember('flexibilityWeights', 'Scalar[]', flexibilityWeights);
    initializationdgnode.addMember('simulationWeights', 'Scalar[]', simulationWeights);
        
    
    var key = FABRIC.Animation.bezierKeyframe;
    var contractionCurve = [];
    contractionCurve.push( key(0.6, 0, null, FABRIC.RT.vec2(0.1, 0)) );
    contractionCurve.push( key(1.0, 1.0, FABRIC.RT.vec2(-0.1, 0), FABRIC.RT.vec2(0.1, 0)));
    contractionCurve.push( key(2.0, 1.0, FABRIC.RT.vec2(-0.1, 0), null));
    initializationdgnode.addMember('contractionCurve', 'BezierKeyframe[]', contractionCurve);
    initializationdgnode.addMember('contractionWeights', 'Scalar[]', contractionWeights);
    
    ////////////////////////////////////////////////////////////////////////////
    // Displacement Map
    
    var quadrantCurve = [];
    quadrantCurve.push( key(0.0, 0.5, null, FABRIC.RT.vec2(0.2, 0)) );
    quadrantCurve.push( key(0.5, 2.0, FABRIC.RT.vec2(-0.2, 0), FABRIC.RT.vec2(0.2, 0)));
    quadrantCurve.push( key(1.0, 0.5, FABRIC.RT.vec2(-0.2, 0), null));
    initializationdgnode.addMember('quadrantCurve0', 'BezierKeyframe[]', quadrantCurve);
    initializationdgnode.addMember('quadrantCurve1', 'BezierKeyframe[]', quadrantCurve);
    initializationdgnode.addMember('quadrantCurve2', 'BezierKeyframe[]', quadrantCurve);
    initializationdgnode.addMember('quadrantCurve3', 'BezierKeyframe[]', quadrantCurve);
    initializationdgnode.addMember('regenerateDisplacementMap', 'Boolean', true);
    initializationdgnode.addMember('displacementMap', 'Color[]');
    
    initializationdgnode.bindings.append(scene.constructOperator({
        operatorName: 'generateDisplacementMap',
        srcFile: './KL/MuscleVolume.kl',
        entryFunctionName: 'generateDisplacementMap',
        preProcessorDefinitions: {
          KEYFRAMETYPE:  'BezierKeyframe',
          KEYFRAME_EVALUATEDTYPE: 'Scalar'
        },
        parameterLayout: [
          'musclesystem.displacementMapResolution',
          
          'self.quadrantCurve0',
          'self.quadrantCurve1',
          'self.quadrantCurve2',
          'self.quadrantCurve3',
          'self.displacementMap',
          'self.regenerateDisplacementMap'

          /*
          'self.initialXfos',
          'self.baseXfo',
          
          'characterMeshAttributes.positions[]',
          'characterMeshAttributes.normals[]',
          'characterMeshUniforms.indices[]',
          */
        ]
      }));
    
    ////////////////////////////////////////////////////////////////////////////
    // Configure the node that will be used to calculate the simulation.
    simulationdgnode.addMember('initialized', 'Boolean', false);
    simulationdgnode.addMember('envelopedXfos', 'Xfo[]', pointXfos); /* Xfos deformed by the skeleton */
    simulationdgnode.addMember('simulatedXfos', 'Xfo[]', pointXfos); /* Xfos simulated and used to drive the skin deformation */
    simulationdgnode.addMember('compressionFactor', 'Scalar', 1.0);
    simulationdgnode.addMember('segmentCompressionFactors', 'Scalar[]', segmentCompressionFactors);
    
    // Note, to be able to upload data to the GPU, the data must be uploaded in one call,
    // and therefore must be laid out in contigous memory.
    simulationdgnode.addMember('cvPositions', 'Mat44');
    simulationdgnode.addMember('cvFrames', 'Mat44');
    
    simulationdgnode.addMember('pointPositionsPrevUpdate', 'Vec3[]', pointPositions);
    simulationdgnode.addMember('pointPositionsPrevUpdate_Temp', 'Vec3[]', pointPositions);
    
    simulationdgnode.bindings.append(scene.constructOperator({
        operatorName: 'simulateMuscle',
        srcFile: './KL/Muscle.kl',
        entryFunctionName: 'simulateMuscle',
        preProcessorDefinitions: {
          KEYFRAMETYPE:  'BezierKeyframe',
          KEYFRAME_EVALUATEDTYPE: 'Scalar'
        },
        parameterLayout: [
          'initializationdgnode.initialXfos',
          'initializationdgnode.baseXfo',
          'initializationdgnode.segmentLengths',
          'initializationdgnode.pointEnvelopeIds',
          'initializationdgnode.pointEnvelopWeights',
          'initializationdgnode.flexibilityWeights',
          'initializationdgnode.contractionCurve',
          'initializationdgnode.contractionWeights',
          
          'self.initialized',
          'self.envelopedXfos',
          'self.simulatedXfos',
          'self.compressionFactor',
          'self.segmentCompressionFactors',
          'self.cvPositions',
          'self.cvFrames',
  
          'self.pointPositionsPrevUpdate',
          'self.pointPositionsPrevUpdate_Temp',
          
          'musclesystem.numRelaxationIterations',
          'musclesystem.gravity',
          
          'globals.timestep',
          'characterRig.skinningXfos'
        ]
      }));
    
    muscle.getLength = function(){
      var pointXfos = initializationdgnode.getData('initialXfos');
      return pointXfos[0].tr.dist(pointXfos[pointXfos.length-1].tr);
    }
    muscle.setLength = function(length){
      var pointXfos = initializationdgnode.getData('initialXfos');
      // Scale all the Xfos away from the center of the muscle.
      var scale = length / pointXfos[0].tr.dist(pointXfos[pointXfos.length-1].tr);
      var center = pointXfos[0].tr.lerp(pointXfos[pointXfos.length-1].tr, 0.5);
      for(i = 0; i < options.numSegments; i++){
        pointXfos[i].tr = pointXfos[i].tr.subtract(center).scale(scale).add(center);
      }
      initializationdgnode.setData('initialXfos', 0, pointXfos);
    }
    
    var coreDisplayLinesNode, coreDisplayPointsNode;
    
    muscle.display = function(){
      /*
        coreDisplayPointsNode = scene.constructNode('Points', { dynamicMembers: ['positions'] });
        coreDisplayPointsNode.pub.addVertexAttributeValue('vertexColors', 'Color', {
          defaultValue: FABRIC.RT.rgb(1.0, 1.0, 0.0),
          genVBO:true,
          dynamic:true
        } );
        coreDisplayPointsNode.getAttributesDGNode().addDependency(initializationdgnode, 'initializationdgnode');
        coreDisplayPointsNode.getAttributesDGNode().addDependency(simulationdgnode, 'simulationdgnode');
        coreDisplayPointsNode.setGeneratorOps([
          scene.constructOperator({
            operatorName: 'setMuscleCoreDisplayVertexCount',
            srcFile: './KL/MuscleRendering.kl',
            entryFunctionName: 'setMuscleCoreDisplayVertexCount',
            parameterLayout: [
              'simulationdgnode.simulatedXfos',
              'self.newCount'
            ]
          }),
          scene.constructOperator({
            operatorName: 'fitMuscleCoreDisplayToMuscleXfos',
            srcFile: './KL/MuscleRendering.kl',
            entryFunctionName: 'fitMuscleCoreDisplayToMuscleXfos',
            parameterLayout: [
              'self.positions[]',
              'self.vertexColors[]',
              'simulationdgnode.simulatedXfos',
              'initializationdgnode.flexibilityWeights',
            ]
          })
        ]);
        
        scene.constructNode('Instance', {
          geometryNode: coreDisplayPointsNode.pub,
          materialNode: scene.constructNode('VertexColorMaterial', {
            prototypeMaterialType:'PointMaterial',
            color: FABRIC.RT.rgb(1.0, 0.0, 0.0),
            pointSize: 6
          }).pub
        });
      */
      
      var volumeDisplayNode = muscleSystem.getVolumeDisplayNode();
      
      var deformedVolume = scene.constructNode('GeometryDataCopy', {
        baseGeometryNode:muscleSystem.getVolumeDisplayNode()
      });
      deformedVolume.pub.addVertexAttributeValue('positions', 'Vec3', { genVBO:true, dynamic:true } );
      deformedVolume.pub.addVertexAttributeValue('normals', 'Vec3', { genVBO:true, dynamic:true } );
      deformedVolume.getAttributesDGNode().addDependency(muscleSystem.getDGNode(), 'musclesystem');
      deformedVolume.getAttributesDGNode().addDependency(initializationdgnode, 'initializationdgnode');
      deformedVolume.getAttributesDGNode().addDependency(simulationdgnode, 'simulationdgnode');
      deformedVolume.getAttributesDGNode().bindings.append(scene.constructOperator({
        operatorName: 'deformMuscleVolume',
        srcFile: './KL/MuscleVolume.kl',
        entryFunctionName: 'deformMuscleVolume',
        preProcessorDefinitions: {
          KEYFRAMETYPE:  'BezierKeyframe',
          KEYFRAME_EVALUATEDTYPE: 'Scalar'
        },
        parameterLayout: [
          'musclesystem.displacementMapResolution',
          'initializationdgnode.displacementMap',
          'simulationdgnode.simulatedXfos',
          'simulationdgnode.compressionFactor',
          'parentattributes.positions[]',
          'parentattributes.normals[]',
          'parentattributes.uvs0[]',
          'self.positions',
          'self.normals',
          'self.index'
        ]
      }));
      
      scene.constructNode('Instance', {
        geometryNode: deformedVolume.pub, 
        materialNode: scene.constructNode('PhongMaterial', {
          diffuseColor: FABRIC.RT.rgba(0.8, 0.0, 0.0, 0.5),
          lightNode: scene.constructNode('PointLight', { position: FABRIC.RT.vec3(420.0, 1000.0, 600.0) }).pub
        }).pub
      }).pub
      .setMaterialNode( 
          scene.constructNode('NormalMaterial', {
          color: FABRIC.RT.rgb(0.8, .8, 0.8, 1),
          normalLength: 0.5
        }).pub);
    }
    
    if(options.display){
      muscle.display();
    }

    return muscle;
  }});


     
FABRIC.SceneGraph.registerNodeType('Skin', {
  factoryFn: function(options, scene) {
    options = scene.assignDefaults(options, {
      muscleSystem: musclesystem,
      baseSkinMesh: undefined
    });
    if(!options.baseSkinMesh){
      throw "A base mesh must be provided";
    }
    var muscleSystem = scene.getPrivateInterface(options.muscleSystem);
  
    var boundSkin = scene.constructNode('GeometryDataCopy', {
      baseGeometryNode:options.baseSkinMesh
    });
    
    boundSkin.pub.addVertexAttributeValue('musclebinding', 'Vec3' );
    boundSkin.pub.addVertexAttributeValue('musclebindingweights', 'Vec3' );
    boundSkin.pub.addVertexAttributeValue('stickweight', 'Scalar' );
    boundSkin.pub.addVertexAttributeValue('slideeight', 'Scalar' );
    boundSkin.pub.addVertexAttributeValue('bulgeweight', 'Scalar' );
    boundSkin.pub.addVertexAttributeValue('sticklocations', 'Vec4[4]' );
    boundSkin.getAttributesDGNode().addDependency(muscleSystem.getDGNode(), 'musclesystem');
    boundSkin.getAttributesDGNode().addDependency(muscleSystem.getMuscles().getInitializationDGNode(), 'musclesinitialization');
    boundSkin.getAttributesDGNode().bindings.append(scene.constructOperator({
      operatorName: 'calcSkinStickLocations',
      srcFile: './KL/MuscleVolume.kl',
      entryFunctionName: 'calcSkinStickLocations',
      parameterLayout: [
        'musclesinitialization.initialXfos[]',
        'parentattributes.positions[]',
        'self.musclebinding',
        'self.sticklocations',
        'self.index'
      ]
    }));
      
    var deformedSkin = scene.constructNode('GeometryDataCopy', {
      baseGeometryNode:options.baseSkinMesh
    });
    deformedSkin.pub.addVertexAttributeValue('positions', 'Vec3', { genVBO:true, dynamic:true } );
    deformedSkin.pub.addVertexAttributeValue('normals', 'Vec3', { genVBO:true, dynamic:true } );
    deformedSkin.getAttributesDGNode().addDependency(muscleSystem.getDGNode(), 'musclesystem');
    deformedSkin.getAttributesDGNode().addDependency(muscleSystem.getMuscles().getInitializationDGNode(), 'musclesinitialization');
    deformedSkin.getAttributesDGNode().addDependency(muscleSystem.getMuscles().getSimulationDGNode(), 'musclessimulation');
    deformedSkin.getAttributesDGNode().addDependency(boundSkin.getAttributesDGNode(), 'boundskin');
    deformedSkin.getAttributesDGNode().bindings.append(scene.constructOperator({
      operatorName: 'deformSkin',
      srcFile: './KL/MuscleVolume.kl',
      entryFunctionName: 'deformSkin',
      parameterLayout: [
        'musclesystem.displacementMapResolution',
        'musclesinitialization.displacementMaps[]',
        'musclessimulation.simulatedXfos[]',
        
        'parentattributes.positions[]',
        'parentattributes.normals[]',
        'parentattributes.uvs0[]',
        'self.positions',
        'self.normals',
        'boundskin.musclebinding',
        'boundskin.musclebindingweights',
        'boundskin.stickweight',
        'boundskin.sticklocations',
        'boundskin.slideeight',
        'boundskin.bulgeweight',
        'self.index'
      ]
    }));
    
  }});
  
