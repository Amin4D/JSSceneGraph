
/*
FABRIC.SceneGraph.defineEffectFromFile('MuscleCoreLineShader', './Shaders/MuscleCoreLineShader.xml');
FABRIC.SceneGraph.defineEffectFromFile('MuscleVolumeShader', './Shaders/MuscleVolumeShader.xml');
*/



FABRIC.RT.DisplacementMap = function() {
  this.pixels = [];
  this.size = 0;
};

FABRIC.RT.DisplacementMap.prototype = {
  
};


FABRIC.appendOnCreateContextCallback(function(context) {
  context.RegisteredTypesManager.registerType('DisplacementMap', {
    members: {
      pixels: 'Color[]',
      size: 'Size'
    },
    constructor: FABRIC.RT.DisplacementMap,
    kBindings: FABRIC.loadResourceURL('./KL/DisplacementMap.kl')
  });
});


FABRIC.RT.Muscle = function( options ) {
  this.displacementMap = new FABRIC.RT.DisplacementMap();
  this.xfos = (options && options.xfos) ? options.xfos : [];
  this.contraction = 1.0;
};

FABRIC.RT.Muscle.prototype = {
  
};


FABRIC.appendOnCreateContextCallback(function(context) {
  context.RegisteredTypesManager.registerType('Muscle', {
    members: {
      displacementMap: 'DisplacementMap',
      xfos: 'Xfo[]',
      contraction: 'Scalar'
    },
    constructor: FABRIC.RT.Muscle
  });
});


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
  
    if (!options.characterRig || !options.characterRig.isTypeOf('CharacterRig')) {
      throw ('Incorrect type. Must assign a CharacterRig');
    }
      
    var muscleSystem = scene.constructNode('SceneGraphNode', options ),
      paramsdgnode = muscleSystem.constructDGNode('SystemParamsDGNode')
      initializationdgnode = muscleSystem.constructDGNode('InitializationDGNode'),
      simulationuniformsdgnode = muscleSystem.constructDGNode('SimulationUniformsDGNode'),
      simulationdgnode = muscleSystem.constructDGNode('SimulationDGNode'),
      characterRigNode = scene.getPrivateInterface(options.characterRig),
      characterSkeletonNode = scene.getPrivateInterface(characterRigNode.pub.getSkeletonNode());
      i;
      
    paramsdgnode.addMember('gravity', 'Vec3', options.gravity);
    paramsdgnode.addMember('numRelaxationIterations', 'Size', options.numRelaxationIterations);
    paramsdgnode.addMember('displacementMapResolution', 'Size', options.displacementMapResolution);
    
    initializationdgnode.setCount(0);
    initializationdgnode.addDependency( paramsdgnode, 'musclesystem');
    
    /////////////////////////////////////////////////////////
    // Configure the muscle members
    initializationdgnode.addMember('initialXfos', 'Xfo[]');/* Xfos deformed by the skeleton */
    initializationdgnode.addMember('segmentLengths', 'Scalar[]');
      
    initializationdgnode.addMember('pointEnvelopeIds', 'Vec2');
    initializationdgnode.addMember('pointEnvelopWeights', 'Vec2[]');
    initializationdgnode.addMember('flexibilityWeights', 'Scalar[]');
    initializationdgnode.addMember('simulationWeights', 'Scalar[]');
    
    initializationdgnode.addMember('contractionCurve', 'BezierKeyframe[]');
    initializationdgnode.addMember('contractionWeights', 'Scalar[]');
    
    ////////////////////////////////////////////////////////////////////////////
    // Displacement Map
    initializationdgnode.addMember('quadrantCurve0', 'BezierKeyframe[]');
    initializationdgnode.addMember('quadrantCurve1', 'BezierKeyframe[]');
    initializationdgnode.addMember('quadrantCurve2', 'BezierKeyframe[]');
    initializationdgnode.addMember('quadrantCurve3', 'BezierKeyframe[]');
    initializationdgnode.addMember('regenerateDisplacementMap', 'Boolean', true);
    initializationdgnode.addMember('displacementMap', 'DisplacementMap');
    
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
    simulationuniformsdgnode.addDependency(characterRigNode.getDGNode(), 'rig');
    simulationuniformsdgnode.addDependency(characterSkeletonNode.getDGNode(), 'skeleton');
    
    simulationuniformsdgnode.addMember('skinningXfos', 'Xfo[]');
    simulationuniformsdgnode.bindings.append(scene.constructOperator({
        operatorName: 'calcSkinningXfos',
        srcFile: 'FABRIC_ROOT/SceneGraph/KL/calcSkinningXfos.kl',
        entryFunctionName: 'calcSkinningXfos',
        parameterLayout: ['rig.pose', 'skeleton.bones', 'self.skinningXfos']
      }));
    
    ////////////////////////////////////////////////////////////////////////////
    // Configure the node that will be used to calculate the simulation
    simulationdgnode.addDependency( paramsdgnode, 'musclesystem');
    simulationdgnode.addDependency( simulationuniformsdgnode, 'uniforms');
    simulationdgnode.addDependency( initializationdgnode, 'initializationdgnode');
    
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
    
    simulationdgnode.addMember('initialized', 'Boolean', false);
    simulationdgnode.addMember('envelopedXfos', 'Xfo[]');
    simulationdgnode.addMember('muscle', 'Muscle', new FABRIC.RT.Muscle());
    
    simulationdgnode.addMember('pointPositionsPrevUpdate', 'Vec3[]');
    simulationdgnode.addMember('pointPositionsPrevUpdate_Temp', 'Vec3[]');
    
    simulationdgnode.addMember('debugDraw', 'DebugGeometry' );
    
    simulationdgnode.bindings.append(scene.constructOperator({
        operatorName: 'simulateMuscle',
        srcFile: './KL/MuscleSimulation.kl',
        entryFunctionName: 'simulateMuscle',
        preProcessorDefinitions: {
          KEYFRAMETYPE:  'BezierKeyframe',
          KEYFRAME_EVALUATEDTYPE: 'Scalar'
        },
        parameterLayout: [
          'initializationdgnode.initialXfos<>',
          'initializationdgnode.segmentLengths<>',
          'initializationdgnode.pointEnvelopeIds<>',
          'initializationdgnode.pointEnvelopWeights<>',
          'initializationdgnode.flexibilityWeights<>',
          'initializationdgnode.contractionCurve<>',
          'initializationdgnode.contractionWeights<>',
          'initializationdgnode.displacementMap<>',
          
          'self.index',
          'self.initialized',
          'self.envelopedXfos',
          'self.muscle',
          
          'self.pointPositionsPrevUpdate',
          'self.pointPositionsPrevUpdate_Temp',
          
          'musclesystem.numRelaxationIterations',
          'musclesystem.gravity',
          
          'globals.timestep',
          'uniforms.skinningXfos',
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
        radius: 1.0,
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
      var xfos = initializationdgnode.getData('initialXfos');
      return xfos[0].tr.dist(xfos[xfos.length-1].tr);
    }
    muscleSystem.setLength = function(index, length){
      var xfos = initializationdgnode.getData('initialXfos');
      // Scale all the Xfos away from the center of the muscle.
      var scale = length / xfos[0].tr.dist(xfos[xfos.length-1].tr);
      var center = xfos[0].tr.lerp(xfos[xfos.length-1].tr, 0.5);
      for(i = 0; i < xfos.length; i++){
        xfos[i].tr = xfos[i].tr.subtract(center).scale(scale).add(center);
      }
      initializationdgnode.setData('initialXfos', index, xfos);
    }
    
    var coreDisplayLinesNodes = [],
      coreDisplayPointsNodes = [],
      volumeDisplayNodes = [];
    
    muscleSystem.display = function(index, muscleOptions){
      
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
          'simulationdgnode.muscle<>',
          'parentattributes.positions<>',
          'parentattributes.normals<>',
          'parentattributes.uvs0<>',
          'self.positions',
          'self.normals',
          'self.index'
        ]
      }));
      
      var inst = scene.constructNode('Instance', {
        geometryNode: deformedVolume.pub,
        materialNode: scene.constructNode('PhongMaterial', {
          prototypeMaterialType: "TransparentMaterial",
          diffuseColor: muscleOptions.diffuseColor,
          ambientColor: muscleOptions.ambientColor,
          lightNode: scene.constructNode('PointLight', { position: FABRIC.RT.vec3(420.0, 1000.0, 600.0) }).pub
        }).pub
      });
      
      volumeDisplayNodes[index] = inst;
    }
    
    
    muscleSystem.pub.addMuscle = function(muscleOptions){
      muscleOptions = scene.assignDefaults(muscleOptions, {
        display: true,
        xfo: FABRIC.RT.xfo(),
        diffuseColor: FABRIC.RT.rgba(0.8, 0.0, 0.0, 0.5),
        ambientColor: FABRIC.RT.rgba(0.1, 0.1, 0.1, 0.2),
        numSegments: 5,
        length: 10,
        radius: 1.5,
        pointEnvelopeIds: FABRIC.RT.vec2(0,1)
      });
      
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
      
      ///////////////////////////////////////
      // Configure the muscle params
      var xfos = [],
        segmentLengths = [],
        pointEnvelopWeights = [],
        segmentCompressionFactors = [],
        flexibilityWeights = [],
        contractionWeights = [],
        simulationWeights= [];
        
      for(i = 0; i < muscleOptions.numSegments; i++){
        xfos.push(
          muscleOptions.xfo.multiply( FABRIC.RT.xfo({
            tr: FABRIC.RT.vec3( ((i/(muscleOptions.numSegments-1)) - 0.5) * muscleOptions.length, 0,0)
          }))
        );
        var envelopWeight = (Math.cos((i/(muscleOptions.numSegments-1)) * Math.PI) + 1) * 0.5;
        pointEnvelopWeights.push(FABRIC.RT.vec2(envelopWeight, 1.0 - envelopWeight));
        
        var flexibilityWeight = (Math.cos((i/(muscleOptions.numSegments-1) * 2.0 * Math.PI)) * 0.45) + 0.55;
        flexibilityWeights.push(1.0 - Math.pow(flexibilityWeight, 3));
        segmentCompressionFactors.push(1.0);
        if(i>0){
          segmentLengths.push(xfos[i].tr.dist(xfos[i-1].tr));
          contractionWeights.push((flexibilityWeights[i]+flexibilityWeights[i-1]) * 0.5 );
        }
      }
      var key = FABRIC.Animation.bezierKeyframe;
      var contractionCurve = [];
      contractionCurve.push( key(0.75, 0, null, FABRIC.RT.vec2(0.1, 0)) );
      contractionCurve.push( key(1.0, 1.0, FABRIC.RT.vec2(-0.1, 0), FABRIC.RT.vec2(0.1, 0)));
      contractionCurve.push( key(2.0, 1.0, FABRIC.RT.vec2(-0.1, 0), null));
      
      initializationdgnode.setData('initialXfos', mid, xfos); /* Xfos deformed by the skeleton */
      initializationdgnode.setData('segmentLengths', mid, segmentLengths);
        
      initializationdgnode.setData('pointEnvelopeIds', mid, muscleOptions.pointEnvelopeIds);
      initializationdgnode.setData('pointEnvelopWeights', mid, pointEnvelopWeights);
      initializationdgnode.setData('flexibilityWeights', mid, flexibilityWeights);
      initializationdgnode.setData('simulationWeights', mid, simulationWeights);
      initializationdgnode.setData('contractionWeights', mid, contractionWeights);
      initializationdgnode.setData('contractionCurve', mid, contractionCurve);
      
      // Displacement Map
      var quadrantCurve = [];
      quadrantCurve.push( key(0.0, muscleOptions.radius * 0.2, null, FABRIC.RT.vec2(0.2, 0)) );
      quadrantCurve.push( key(0.5, muscleOptions.radius, FABRIC.RT.vec2(-0.2, 0), FABRIC.RT.vec2(0.2, 0)));
      quadrantCurve.push( key(1.0, muscleOptions.radius * 0.2, FABRIC.RT.vec2(-0.2, 0), null));
      initializationdgnode.setData('quadrantCurve0', mid, quadrantCurve);
      initializationdgnode.setData('quadrantCurve1', mid, quadrantCurve);
      initializationdgnode.setData('quadrantCurve2', mid, quadrantCurve);
      initializationdgnode.setData('quadrantCurve3', mid, quadrantCurve);
      
      if(muscleOptions.display){
        muscleSystem.display(mid, muscleOptions);
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
    
    boundSkin.pub.addUniformValue('reload', 'Boolean', false );
    boundSkin.pub.addVertexAttributeValue('muscleBindingIds', 'Integer[4]', [0,-1,-1,-1]);
    boundSkin.pub.addVertexAttributeValue('musclebindingweights', 'Scalar[4]', [1,0,0,0] );
    boundSkin.pub.addVertexAttributeValue('stickLocations', 'Vec3[4]' );
    boundSkin.pub.addVertexAttributeValue('stickWeight', 'Scalar', { defaultValue:0.0 } );
    boundSkin.pub.addVertexAttributeValue('slideWeight', 'Scalar', { defaultValue:0.0 } );
    boundSkin.pub.addVertexAttributeValue('bulgeWeight', 'Scalar', { defaultValue:0.0 } );
    boundSkin.getAttributesDGNode().addDependency(muscleSystem.getSystemParamsDGNode(), 'musclesystem');
    boundSkin.getAttributesDGNode().addDependency(muscleSystem.getInitializationDGNode(), 'musclesinitialization');
    var calcSkinStickLocationsOp = scene.constructOperator({
      operatorName: 'calcSkinStickLocations',
      srcFile: './KL/MuscleVolume.kl',
      entryFunctionName: 'calcSkinStickLocations',
      preProcessorDefinitions: {
        KEYFRAMETYPE:  'BezierKeyframe',
        KEYFRAME_EVALUATEDTYPE: 'Scalar'
      },
      parameterLayout: [
        'musclesinitialization.initialXfos<>',
        'parentattributes.positions<>',
        'self.muscleBindingIds',
        'self.stickLocations',
        'self.index'
      ]
    });
  //  calcSkinStickLocationsOp.getOperator().setMainThreadOnly(true);
    boundSkin.getAttributesDGNode().bindings.append(calcSkinStickLocationsOp);
    
    
    var deformedSkin = scene.constructNode('GeometryDataCopy', {
      name: 'DeformedSkin',
      baseGeometryNode:options.baseSkinMesh
    });
    
    deformedSkin.pub.addVertexAttributeValue('positions', 'Vec3', { genVBO:true, dynamic:true } );
    deformedSkin.pub.addVertexAttributeValue('normals', 'Vec3', { genVBO:true, dynamic:true } );
    deformedSkin.pub.addVertexAttributeValue('vertexColors', 'Color', { genVBO:true, dynamic:true });
    deformedSkin.pub.addVertexAttributeValue('debugDraw', 'DebugGeometry' );
    deformedSkin.getAttributesDGNode().addDependency(muscleSystem.getSystemParamsDGNode(), 'musclesystem');
    deformedSkin.getAttributesDGNode().addDependency(muscleSystem.getInitializationDGNode(), 'musclesinitialization');
    deformedSkin.getAttributesDGNode().addDependency(muscleSystem.getSimulationDGNode(), 'musclessimulation');
    deformedSkin.getAttributesDGNode().addDependency(boundSkin.getAttributesDGNode(), 'boundskin');
    
    deformedSkin.getAttributesDGNode().bindings.append(scene.constructOperator({
      operatorName: 'setVertexColorByWeight',
      srcFile: './KL/skin.kl',
      entryFunctionName: 'setVertexColorByWeight',
      parameterLayout: [
        'boundskin.stickWeight<>',
        'boundskin.slideWeight<>',
        'boundskin.bulgeWeight<>',
        'self.vertexColors',
        'self.index'
      ]
    }));
    
    var deformSkinOp = scene.constructOperator({
      operatorName: 'deformSkin',
      srcFile: './KL/MuscleVolume.kl',
      entryFunctionName: 'deformSkin',
      preProcessorDefinitions: {
        KEYFRAMETYPE:  'BezierKeyframe',
        KEYFRAME_EVALUATEDTYPE: 'Scalar'
      },
      parameterLayout: [
        'musclessimulation.muscle<>',
        
        'parentattributes.positions<>',
        'parentattributes.normals<>',
        'self.positions',
        'self.normals',
        'boundskin.muscleBindingIds<>',
        'boundskin.musclebindingweights<>',
        'boundskin.stickWeight<>',
        'boundskin.stickLocations<>',
        'boundskin.slideWeight<>',
        'boundskin.bulgeWeight<>',
        'self.index',
        'self.debugDraw'
      ]
    });
    
  //  deformSkinOp.getOperator().setMainThreadOnly(true);
    deformedSkin.getAttributesDGNode().bindings.append(deformSkinOp);
    
    var debugGeometryDraw = scene.constructNode('DebugGeometryDraw', {
        dgnode: deformedSkin.getAttributesDGNode(),
        debugGemetryMemberName: 'debugDraw'
    });
    
    deformedSkin.getBoundSkin = function(){
      return boundSkin;
    };
    
    deformedSkin.reload = function(){
      boundSkin.getUniformsDGNode().setData('reload', 0, true);
      deformedSkin.pub.reloadVBO('vertexColors');
    };
    
    /*
    deformedSkin.pub.getBulkAttributeData = function( indices ){
      return boundSkin.pub.getBulkAttributeData( indices );
    };
    
    deformedSkin.pub.setBulkAttributeData = function( data ){
      boundSkin.pub.setBulkAttributeData( data );
      deformedSkin.pub.reloadVBO('vertexColors');
    };
    */
    
    return deformedSkin;
  }});
  


FABRIC.SceneGraph.registerNodeType('PaintSkinWeightsManipulator', {
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
      mode: 0
      });
    
    var paintSkinWeightsManipulator = scene.constructNode('PaintManipulator', options);
    var paintableNodes = [];
    var paintableNodePaintHandlers = [];
    paintSkinWeightsManipulator.pub.addPaintableNode = function(node) {
      if (!node.isTypeOf || !node.isTypeOf('Instance')) {
        throw ('Incorrect type. Must assign a Instance');
      }

      if (!node.getGeometryNode().pub.isTypeOf('MuscleSkinDeformation')) {
        throw ('Incorrect type. Must assign a MuscleSkinDeformation');
      }

      var paintInstanceEventHandler,
        instanceNode = scene.getPrivateInterface(node),
        geometryNode = scene.getPrivateInterface(instanceNode.pub.getGeometryNode()),
        transformNode = scene.getPrivateInterface(instanceNode.pub.getTransformNode()),
        paintOperator;

      paintInstanceEventHandler = paintSkinWeightsManipulator.constructEventHandlerNode('Paint' + node.getName());
      paintInstanceEventHandler.addScope('boundgeometryattributes', geometryNode.getBoundSkin().getAttributesDGNode());
      paintInstanceEventHandler.addScope('geometryattributes', geometryNode.getAttributesDGNode());
      paintInstanceEventHandler.addScope('geometryuniforms', geometryNode.getUniformsDGNode());
      paintInstanceEventHandler.addScope('transform', transformNode.getDGNode());
      paintInstanceEventHandler.addScope('instance', instanceNode.getDGNode());

      // The selector will return the node bound with the given binding name.
      var paintingOpDef = {
          operatorName: 'paintSkinWeights',
          srcFile: './KL/paintSkinOp.kl',
          entryFunctionName: 'paintSkinWeights',
          parameterLayout: [
            'paintData.cameraMatrix',
            'paintData.projectionMatrix',
            'paintData.aspectRatio',
  
            'paintData.brushPos',
            'paintData.brushSize',
            'paintData.mode',
  
            'transform.globalXfo',
            'geometryattributes.positions<>',
            'geometryattributes.normals<>',
            
            'boundgeometryattributes.stickWeight<>',
            'boundgeometryattributes.slideWeight<>',
            'boundgeometryattributes.bulgeWeight<>'
          ],
          async: false
        };
      paintInstanceEventHandler.setSelector('instance', scene.constructOperator(paintingOpDef));
      paintEventHandler.appendChildEventHandler(paintInstanceEventHandler);

      paintableNodes.push(geometryNode);
      paintableNodePaintHandlers.push(paintInstanceEventHandler);
    };
    
    paintSkinWeightsManipulator.pub.addEventListener('onpaint', function(evt) {
      for(var i=0;i<paintableNodes.length; i++){
        paintableNodes[i].reload();
      }
      evt.viewportNode.redraw();
    });
    
    var paintEventHandler = paintSkinWeightsManipulator.getPaintEventHandler();
    paintEventHandler.addMember('mode', 'Integer', options.mode);
    paintSkinWeightsManipulator.addMemberInterface(paintEventHandler, 'mode', true);
    
    return paintSkinWeightsManipulator;
  }});

