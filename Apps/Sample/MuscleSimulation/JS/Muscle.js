    
// These Node definitions are inlined for now, but will
// be moved to a separate file once they are stabilized. 
FABRIC.SceneGraph.registerNodeType('Muscle', {
  factoryFn: function(options, scene) {
    options = scene.assignDefaults(options, {
      numSegments: 5,
      length: 10
      });
    
    var muscle = scene.constructNode('SceneGraphNode', options ),
      dgnode = muscle.constructDGNode('DGNode'),
      i;
    
    var segmentXfos = [],
      segmentEnvelopeIds = [],
      segmentEnvelopWeights = [];
      
    for(i = 0; i < options.numSegments; i++){
      segmentXfos.push(FABRIC.RT.xfo( {
        tr: FABRIC.RT.vec3( ((i/options.numSegments) - 0.5) * options.length, 0,0)
      }));
      segmentEnvelopeIds.push(FABRIC.RT.vec4(-1,-1,-1,-1));
      segmentEnvelopWeights.push(FABRIC.RT.vec4());
    }
    
    dgnode.addMember('segmentXfos', 'Xfo[]', segmentXfos);
    dgnode.addMember('segmentEnvelopeIds', 'Vec4[]', segmentEnvelopeIds);
    dgnode.addMember('segmentEnvelopWeights', 'Vec4[]', segmentEnvelopWeights);
    
    var key = FABRIC.Animation.bezierKeyframe;
    contractionCurve = [];
    contractionCurve.push( key(0.8, 0, null, FABRIC.RT.vec2(0.1, 0)) );
    contractionCurve.push( key(1.0, 1.0, FABRIC.RT.vec2(-0.1, 0), FABRIC.RT.vec2(0.1, 0)));
    contractionCurve.push( key(2.0, 2.0, FABRIC.RT.vec2(-0.1, 0), FABRIC.RT.vec2(0.1, 0)));
    dgnode.addMember('contractionCurve', 'BezierKeyframe[]', contractionCurve);
    
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


