    
// These Node definitions are inlined for now, but will
// be moved to a separate file once they are stabilized. 
FABRIC.SceneGraph.registerNodeType('MuscleSystem', {
  factoryFn: function(options, scene) {
    options = scene.assignDefaults(options, {
      volumeConstraintMesh: undefined
      });
    var muscleSystem = scene.constructNode('SceneGraphNode', options ),
      dgnode = muscle.constructDGNode('DGNode'),
      i;
      
    dgnode.addMember('gravity', 'Vec3', FABRIC.RT.vec2(0, -9.0, 0));
    
    muscleSystem.setVolumeConstraintMesh = function(mesh){
      
      dgnode.addBinding( mesh, "constraintMesh");
      dgnode.addMember('volumeConstraintMesh', 'TriangleMesh');
      
    }
    
    return muscleSystem;
  }});
     
FABRIC.SceneGraph.registerNodeType('Muscle', {
  factoryFn: function(options, scene) {
    options = scene.assignDefaults(options, {
      numSegments: 5,
      displacementMapResolution: 32,
      length: 10,
      muscleSystem: undefined,
      skeleton: undefined
      });
    
    var muscle = scene.constructNode('SceneGraphNode', options ),
      dgnode = muscle.constructDGNode('DGNode'),
      i;
    
    var segmentXfos = [],
      segmentLengths = [],
      pointEnvelopeIds = [],
      pointEnvelopWeights = [],
      segmentCompressionFactors = [],
      flexibilityWeights = [],
      pointPositionsPrevUpdate = [];
      
    for(i = 0; i < options.numSegments; i++){
      segmentXfos.push(FABRIC.RT.xfo( {
        tr: FABRIC.RT.vec3( ((i/options.numSegments) - 0.5) * options.length, 0,0)
      }));
      pointEnvelopeIds.push(FABRIC.RT.vec2(-1,-1));
      pointEnvelopWeights.push(FABRIC.RT.vec2());
      flexibilityWeights.push(0.0);
      pointPositionsPrevUpdate.push(segmentXfos[i].tr);
      if(i>0){
        segmentLengths.push(segmentXfos[i].tr.dist(segmentXfos[i-1]));
        segmentCompressionFactors.push(1.0);
      }
    }
    
    dgnode.addMember('initialXfos', 'Xfo[]', segmentXfos); /* Xfos deformed by the skeleton */
    dgnode.addMember('envelopedXfos', 'Xfo[]', segmentXfos); /* Xfos deformed by the skeleton */
    dgnode.addMember('simulatedXfos', 'Xfo[]', segmentXfos); /* Xfos simulated and used to drive the skin deformation */
    
    dgnode.addMember('segmentLengths', 'Scalar[]', segmentLengths);
    dgnode.addMember('segmentCompressionFactors', 'Scalar[]', segmentCompressionFactors);
    
    dgnode.addMember('pointEnvelopeIds', 'Vec2', pointEnvelopeIds);
    dgnode.addMember('pointEnvelopWeights', 'Vec2[]', pointEnvelopWeights);
    dgnode.addMember('flexibilityWeights', 'Scalar[]', flexibilityWeights);
    
    dgnode.addMember('pointPositionsPrevUpdate', 'Vec3[]', pointPositionsPrevUpdate);
    dgnode.addMember('pointPositionsPrevUpdate_Temp', 'Vec3[]', pointPositionsPrevUpdate);
    dgnode.addMember('numRelaxationIterations', 'Integer', 5);
    
    var displacementMap = [];
    for(i = 0; i < options.displacementMapResolution; i++){
      for(j = 0; j < options.displacementMapResolution; j++){
        displacementMap.push(0.0);
      }
    }
    
    dgnode.addMember('deltaMap', 'Scalar[]', displacementMap);
    dgnode.addMember('displacementMap', 'Scalar[]', displacementMap);
    
    var key = FABRIC.Animation.bezierKeyframe;
    var contractionCurve = [];
    contractionCurve.push( key(0.8, 0, null, FABRIC.RT.vec2(0.1, 0)) );
    contractionCurve.push( key(1.0, 1.0, FABRIC.RT.vec2(-0.1, 0), FABRIC.RT.vec2(0.1, 0)));
    contractionCurve.push( key(2.0, 2.0, FABRIC.RT.vec2(-0.1, 0), null));
    dgnode.addMember('contractionCurve', 'BezierKeyframe[]', contractionCurve);
    
    
    var quadrantCurve = [];
    quadrantCurve.push( key(0.0, 0, null, FABRIC.RT.vec2(0.1, 0)) );
    quadrantCurve.push( key(1.0, 1.0, FABRIC.RT.vec2(-0.33, 0), FABRIC.RT.vec2(0.33, 0)));
    quadrantCurve.push( key(2.0, 0.0, FABRIC.RT.vec2(-0.33, 0), null));
    dgnode.addMember('quadrantCurve0', 'BezierKeyframe[]', quadrantCurve);
    dgnode.addMember('quadrantCurve1', 'BezierKeyframe[]', quadrantCurve);
    dgnode.addMember('quadrantCurve2', 'BezierKeyframe[]', quadrantCurve);
    dgnode.addMember('quadrantCurve3', 'BezierKeyframe[]', quadrantCurve);
    
    dgnode.addBinding( options.muscleSystem, "musclesystem");
    dgnode.addBinding( options.skeleton, "skeleton");
    dgnode.addBinding( scene.getGlobalsNode(), "globals");
    
    
    dgnode.bindings.append(scene.constructOperator({
        operatorName: 'simulateMuscle',
        srcFile: './KL/muscle.kl',
        entryFunctionName: 'simulateMuscle',
        parameterLayout: [
          "self.initialXfos",
          "self.envelopedXfos",
          "self.simulatedXfos",
          "self.segmentLengths",
          "self.segmentCompressionFactors",
          "self.pointEnvelopeIds",
          "self.pointEnvelopWeights",
          "self.flexibilityWeights",
  
          "self.pointPositionsPrevUpdate",
          "self.pointPositionsPrevUpdate_Temp",
          "self.numRelaxationIterations",
  
          "self.contractionCurve",
  
          "musclesystem.gravity",
          "globals.deltaT",
          "skeleton.skeletonMatrices",
        ]
      }));
    
    
    muscle.getLength = function(){
      var segmentXfos = dgnode.getData('segmentXfos');
      return segmentXfos[0].tr.dist(segmentXfos[segmentXfos.length-1].tr);
    }
    muscle.setLength = function(length){
      var segmentXfos = dgnode.getData('segmentXfos');
      // Scale all the Xfos away from the center of the muscle.
      var scale = length / segmentXfos[0].tr.dist(segmentXfos[segmentXfos.length-1].tr);
      var center = segmentXfos[0].tr.lerp(segmentXfos[segmentXfos.length-1].tr, 0.5);
      for(i = 0; i < options.numSegments; i++){
        segmentXfos[i].tr = segmentXfos[i].tr.subtract(center).scale(scale).add(center);
      }
      dgnode.setData('segmentXfos', 0, segmentXfos);
    }
    
    var coreDisplayNode;
    muscle.displayCore = function(){
      if(!coreDisplayNode){
        coreDisplayNode = scene.constructNode('Lines');
        coreDisplayNode.pub.addVertexAttributeValue('vertexColors', 'Color', { genVBO:true } );
        coreDisplayNode.getAttributesDGNode().addDependency(dgnode, 'muscles')
        coreDisplayNode.setGeneratorOps([
          scene.constructOperator({
            operatorName: 'setMuscleCoreVertexCount',
            srcFile: './KL/muscle.kl',
            entryFunctionName: 'setMuscleCoreVertexCount',
            parameterLayout: [
              'muscles.segmentXfos[]',
              'self.indices',
              'self.newCount'
            ]
          }),
          scene.constructOperator({
            operatorName: 'fitMuscleCoreToMuscleXfos',
            srcFile: './KL/muscle.kl',
            entryFunctionName: 'fitMuscleCoreToMuscleXfos',
            parameterLayout: [
              'muscles.segmentXfos',
              'self.positions[]'
            ]
          })
        ]);
      }
    }
  }});


