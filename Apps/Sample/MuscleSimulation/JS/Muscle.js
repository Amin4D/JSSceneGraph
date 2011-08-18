    
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
    
    muscle.displayCore = function(){
      var coreDisplayNode = scene.constructNode('Lines');
      coreDisplayNode.pub.addVertexAttributeValue('vertexColors', 'Color', { genVBO:true } );
      crossNode.pub.addUniformValue('crosssize', 'Scalar', options.size);
      crossNode.getAttributesDGNode().addDependency(dgnode, 'muscles')
      crossNode.setGeneratorOps([
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
  }});


