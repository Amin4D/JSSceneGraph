
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
      paramsdgnode = muscleSystem.constructDGNode('SystemParamsDGNode')
      initializationdgnode = muscleSystem.constructDGNode('InitializationDGNode'),
      simulationdgnode = muscleSystem.constructDGNode('SimulationDGNode'),
      characterRig = scene.getPrivateInterface(options.characterRig),
      i;
      
    paramsdgnode.addMember('gravity', 'Vec3', options.gravity);
    paramsdgnode.addMember('numRelaxationIterations', 'Size', options.numRelaxationIterations);
    paramsdgnode.addMember('displacementMapResolution', 'Size', options.displacementMapResolution);
    
    var muscleDefaults = {
        numSegments: 3,
        length: 10,
        display: true,
        xfo: FABRIC.RT.xfo(),
        pointEnvelopeIds: FABRIC.RT.vec2(0,1)
      }
    
    initializationdgnode.setCount(0);
    initializationdgnode.addDependency( paramsdgnode, 'musclesystem');
    simulationdgnode.addDependency( paramsdgnode, 'musclesystem');
    simulationdgnode.addDependency( initializationdgnode, 'initializationdgnode');
    
    simulationdgnode.addDependency( characterRig.getDGNode(), 'characterRig');
    simulationdgnode.addDependency( scene.getGlobalsNode(), 'globals');
    
    simulationdgnode.bindings.append(
      scene.constructOperator({
        operatorName: 'matchCount',
        srcCode: '\n'+
        'operator matchCount(Size parentCount, io Size selfCount) {\n' +
        '  selfCount = parentCount;\n' +
        '}',
        entryFunctionName: 'matchCount',
        parameterLayout: [
          'initializationdgnode.count',
          'self.newCount'
        ]
      }));
    
    /////////////////////////////////////////////////////////
    // Configure the muscle default values. 
    var pointXfos = [],
      segmentLengths = [],
      pointEnvelopWeights = [],
      segmentCompressionFactors = [],
      flexibilityWeights = [],
      contractionWeights = [],
      simulationWeights= [],
      pointPositions = [];
      
    for(i = 0; i < muscleDefaults.numSegments; i++){
      pointXfos.push(FABRIC.RT.xfo( {
        tr: FABRIC.RT.vec3( ((i/(muscleDefaults.numSegments-1)) - 0.5) * muscleDefaults.length, 0,0)
      }));
      var envelopWeight = (Math.cos((i/(muscleDefaults.numSegments-1)) * Math.PI) + 1) * 0.5;
      pointEnvelopWeights.push(FABRIC.RT.vec2(envelopWeight, 1.0 - envelopWeight));
      
      var flexibilityWeight = (Math.cos((i/(muscleDefaults.numSegments-1) * 2.0 * Math.PI)) * 0.45) + 0.55;
      flexibilityWeights.push(1.0 - Math.pow(flexibilityWeight, 4));
      pointPositions.push(pointXfos[i].tr);
      segmentCompressionFactors.push(1.0);
      if(i>0){
        segmentLengths.push(pointXfos[i].tr.dist(pointXfos[i-1].tr));
        contractionWeights.push((flexibilityWeights[i]+flexibilityWeights[i-1]) * 0.5 );
      }
    }
    
    initializationdgnode.addMember('initialXfos', 'Xfo[]', pointXfos); /* Xfos deformed by the skeleton */
    initializationdgnode.addMember('xfo', 'Xfo', muscleDefaults.xfo); /* Xfos deformed by the skeleton */
    initializationdgnode.addMember('segmentLengths', 'Scalar[]', segmentLengths);
      
    initializationdgnode.addMember('pointEnvelopeIds', 'Vec2', muscleDefaults.pointEnvelopeIds);
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
    
    
    simulationdgnode.addMember('debugDraw', 'DebugGeometry' );
    
    simulationdgnode.bindings.append(scene.constructOperator({
        operatorName: 'simulateMuscle',
        srcFile: './KL/Muscle.kl',
        entryFunctionName: 'simulateMuscle',
        preProcessorDefinitions: {
          KEYFRAMETYPE:  'BezierKeyframe',
          KEYFRAME_EVALUATEDTYPE: 'Scalar'
        },
        parameterLayout: [
          'initializationdgnode.initialXfos[]',
          'initializationdgnode.xfo[]',
          'initializationdgnode.segmentLengths[]',
          'initializationdgnode.pointEnvelopeIds[]',
          'initializationdgnode.pointEnvelopWeights[]',
          'initializationdgnode.flexibilityWeights[]',
          'initializationdgnode.contractionCurve[]',
          'initializationdgnode.contractionWeights[]',
          
          'self.index',
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
          'characterRig.skinningXfos',
          'self.debugDraw'
        ]
      }));
    
    
    
    var debugGeometryDraw = scene.constructNode('DebugGeometryDraw', {
        dgnode: simulationdgnode,
        debugGemetryMemberName: 'debugDraw'
    });

    
    //////////////////////////////////////////////////////////
    // Volume Display
    var volumeDisplayNode = scene.constructNode('Cylinder', {
        radius: 0.5,
        height: 1.0,
        sides: options.displacementMapResolution,
        loops: options.displacementMapResolution,
        caps: false,
        createBoundingBoxNode: false
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
    
    //////////////////////////////////////////////////////////
    
    muscleSystem.setVolumeConstraintMesh = function(mesh){
      paramsdgnode.addBinding( mesh, 'constraintMesh');
      paramsdgnode.addMember('volumeConstraintMesh', 'TriangleMesh');
    }
    
    muscleSystem.getLength = function(index){
      var pointXfos = initializationdgnode.getData('initialXfos');
      return pointXfos[0].tr.dist(pointXfos[pointXfos.length-1].tr);
    }
    muscleSystem.setLength = function(index, length){
      var pointXfos = initializationdgnode.getData('initialXfos');
      // Scale all the Xfos away from the center of the muscle.
      var scale = length / pointXfos[0].tr.dist(pointXfos[pointXfos.length-1].tr);
      var center = pointXfos[0].tr.lerp(pointXfos[pointXfos.length-1].tr, 0.5);
      for(i = 0; i < muscleDefaults.numSegments; i++){
        pointXfos[i].tr = pointXfos[i].tr.subtract(center).scale(scale).add(center);
      }
      initializationdgnode.setData('initialXfos', 0, pointXfos);
    }
    
    var coreDisplayLinesNodes = [],
      coreDisplayPointsNodes = [],
      volumeDisplayNodes = [];
    
    muscleSystem.display = function(index){
      
      var deformedVolume = scene.constructNode('GeometryDataCopy', {
        baseGeometryNode:volumeDisplayNode.pub
      });
      deformedVolume.pub.addVertexAttributeValue('positions', 'Vec3', { genVBO:true, dynamic:true } );
      deformedVolume.pub.addVertexAttributeValue('normals', 'Vec3', { genVBO:true, dynamic:true } );
      deformedVolume.pub.addUniformValue('muscleIndex', 'Size', index );
      deformedVolume.getAttributesDGNode().addDependency(paramsdgnode, 'musclesystem');
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
          'uniforms.muscleIndex',
          'musclesystem.displacementMapResolution',
          'initializationdgnode.displacementMap[]',
          'simulationdgnode.simulatedXfos[]',
          'simulationdgnode.compressionFactor[]',
          'parentattributes.positions[]',
          'parentattributes.normals[]',
          'parentattributes.uvs0[]',
          'self.positions',
          'self.normals',
          'self.index'
        ]
      }));
      
      var inst = scene.constructNode('Instance', {
        geometryNode: deformedVolume.pub,
        materialNode: scene.constructNode('PhongMaterial', {
          diffuseColor: FABRIC.RT.rgba(0.8, 0.0, 0.0, 0.5),
          lightNode: scene.constructNode('PointLight', { position: FABRIC.RT.vec3(420.0, 1000.0, 600.0) }).pub
        }).pub
      });
      
      volumeDisplayNodes[index] = inst;
    }
    
    
    muscleSystem.pub.addMuscle = function( muscleOptions ){
      muscleOptions = scene.assignDefaults(muscleOptions, {
        display: true
      });
          
      muscleOptions = scene.assignDefaults(muscleOptions, muscleDefaults);
      var mid = initializationdgnode.getCount();
      initializationdgnode.setCount(mid+1);
      var initializationMembers = initializationdgnode.getMembers();
      for(i in muscleOptions){
        if(initializationMembers[i]){
          initializationdgnode.setData(i, mid, muscleOptions[i]);
        }
      }
      var simulationdMembers = simulationdgnode.getMembers();
      for(i in muscleOptions){
        if(simulationdMembers[i]){
          simulationdgnode.setData(i, mid, muscleOptions[i]);
        }
      }
      if(muscleOptions.display){
        muscleSystem.display(mid);
      }
    }
    
    return muscleSystem;
  }});


     
FABRIC.SceneGraph.registerNodeType('MuscleSkinDeformation', {
  factoryFn: function(options, scene) {
    options = scene.assignDefaults(options, {
      muscleSystem: undefined,
      baseSkinMesh: undefined
    });
    if(!options.baseSkinMesh){
      throw "A base mesh must be provided";
    }
    var muscleSystem = scene.getPrivateInterface(options.muscleSystem);
  
    var boundSkin = scene.constructNode('GeometryDataCopy', {
      name: 'BoundSkin',
      baseGeometryNode:options.baseSkinMesh
    });
    
    boundSkin.pub.addVertexAttributeValue('muscleBindingIds', 'Integer[4]', [0,-1,-1,-1]);
    boundSkin.pub.addVertexAttributeValue('musclebindingweights', 'Scalar[4]', [1,0,0,0] );
    boundSkin.pub.addVertexAttributeValue('stickWeight', 'Scalar' );
    boundSkin.pub.addVertexAttributeValue('slideWeight', 'Scalar' );
    boundSkin.pub.addVertexAttributeValue('bulgeWeight', 'Scalar' );
    boundSkin.pub.addVertexAttributeValue('stickLocations', 'Vec3[4]' );
    boundSkin.getAttributesDGNode().addDependency(muscleSystem.getSystemParamsDGNode(), 'musclesystem');
    boundSkin.getAttributesDGNode().addDependency(muscleSystem.getInitializationDGNode(), 'musclesinitialization');
    var op = scene.constructOperator({
      operatorName: 'calcSkinStickLocations',
      srcFile: './KL/MuscleVolume.kl',
      entryFunctionName: 'calcSkinStickLocations',
      preProcessorDefinitions: {
        KEYFRAMETYPE:  'BezierKeyframe',
        KEYFRAME_EVALUATEDTYPE: 'Scalar'
      },
      parameterLayout: [
        'musclesinitialization.initialXfos[]',
        'parentattributes.positions[]',
        'self.muscleBindingIds',
        'self.stickLocations',
        'self.index'
      ]
    });
    op.getOperator().setMainThreadOnly(true);
    boundSkin.getAttributesDGNode().bindings.append(op);
    
    
    var deformedSkin = scene.constructNode('GeometryDataCopy', {
      name: 'DeformedSkin',
      baseGeometryNode:options.baseSkinMesh
    });
    
    deformedSkin.pub.addVertexAttributeValue('positions', 'Vec3', { genVBO:true, dynamic:true } );
    deformedSkin.pub.addVertexAttributeValue('normals', 'Vec3', { genVBO:true, dynamic:true } );
    deformedSkin.pub.addVertexAttributeValue('vertexColors', 'Color', { genVBO:true });
    deformedSkin.pub.addVertexAttributeValue('debugDraw', 'DebugGeometry' );
    deformedSkin.getAttributesDGNode().addDependency(muscleSystem.getSystemParamsDGNode(), 'musclesystem');
    deformedSkin.getAttributesDGNode().addDependency(muscleSystem.getInitializationDGNode(), 'musclesinitialization');
    deformedSkin.getAttributesDGNode().addDependency(muscleSystem.getSimulationDGNode(), 'musclessimulation');
    deformedSkin.getAttributesDGNode().addDependency(boundSkin.getAttributesDGNode(), 'boundskin');
    deformedSkin.getAttributesDGNode().addDependency(boundSkin.getUniformsDGNode(), 'boundskinuniforms');
    
    deformedSkin.getAttributesDGNode().bindings.append(scene.constructOperator({
      operatorName: 'setVertexColorByWeight',
      srcFile: './KL/skin.kl',
      entryFunctionName: 'setVertexColorByWeight',
      parameterLayout: [
        'boundskin.stickWeight[]',
        'boundskin.slideWeight[]',
        'boundskin.bulgeWeight[]',
        'self.vertexColors',
        'self.index'
      ]
    }));
    
    deformedSkin.getAttributesDGNode().bindings.append(scene.constructOperator({
      operatorName: 'deformSkin',
      srcFile: './KL/MuscleVolume.kl',
      entryFunctionName: 'deformSkin',
      preProcessorDefinitions: {
        KEYFRAMETYPE:  'BezierKeyframe',
        KEYFRAME_EVALUATEDTYPE: 'Scalar'
      },
      parameterLayout: [
        'musclesystem.displacementMapResolution',
        'musclesinitialization.displacementMap[]',
        'musclessimulation.simulatedXfos[]',
        
        'parentattributes.positions[]',
        'parentattributes.normals[]',
        'self.positions',
        'self.normals',
        'boundskin.muscleBindingIds[]',
        'boundskin.musclebindingweights[]',
        'boundskin.stickWeight[]',
        'boundskin.stickLocations[]',
        'boundskin.slideWeight[]',
        'boundskin.bulgeWeight[]',
        'self.index',
        'self.debugDraw'
      ]
    }));
    
    var debugGeometryDraw = scene.constructNode('DebugGeometryDraw', {
        dgnode: deformedSkin.getAttributesDGNode(),
        debugGemetryMemberName: 'debugDraw'
    });
    
    deformedSkin.getBoundSkin = function(){
      return boundSkin;
    };
    
    deformedSkin.pub.getBulkAttributeData = function( indices ){
      return boundSkin.pub.getBulkAttributeData( indices );
    };
    
    deformedSkin.pub.setBulkAttributeData = function( data ){
      boundSkin.pub.setBulkAttributeData( data );
      deformedSkin.pub.reloadVBO('vertexColors');
    };

    return deformedSkin;
  }});
  
