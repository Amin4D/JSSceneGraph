
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//


FABRIC.SceneGraph.registerNodeType('ObjLoadTriangles', {
  briefDesc: 'The ObjLoadTriangles node is a resource load node able to load OBJ files.',
  detailedDesc: 'The ObjLoadTriangles node is a resource load node able to load OBJ files. It utilizes a C++ based extension to load OBJ files in a very fast fashion.',
  parentNodeDesc: 'ResourceLoad',
  optionsDesc: {
    removeParsersOnLoad: 'If set to true, the parser operator will be removed after parsing.'
  },
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
      removeParsersOnLoad: false
    });

    options.uvSets = 1; //To refine... what if there is no UV set??

    var resourceLoadNode = scene.constructNode('ResourceLoad', options),
      resourceloaddgnode = resourceLoadNode.getDGLoadNode(),
      trianglesNode = scene.constructNode('Triangles', options),
      emptyBindingsFunction;

    trianglesNode.getAttributesDGNode().setDependency(resourceloaddgnode, 'resource');
    trianglesNode.getUniformsDGNode().setDependency(resourceloaddgnode, 'resource');
    trianglesNode.pub.addUniformValue('reload', 'Boolean', true);
    trianglesNode.pub.addUniformValue('handle', 'Data');

    trianglesNode.setGeneratorOps([
      scene.constructOperator({
        operatorName: 'parseObjAndSetVertexCount',
        srcFile: 'FABRIC_ROOT/SceneGraph/KL/loadObj.kl',
        entryFunctionName: 'parseObjAndSetVertexCount',
        parameterLayout: [
          'resource.resource',
          'uniforms.handle',
          'uniforms.reload',
          'self.newCount'
        ]
      }),
      scene.constructOperator({
        operatorName: 'setObjGeom',
        srcFile: 'FABRIC_ROOT/SceneGraph/KL/loadObj.kl',
        entryFunctionName: 'setObjGeom',
        parameterLayout: [
          'uniforms.handle',
          'uniforms.indices',
          'self.positions<>',
          'self.normals<>',
          'self.uvs0<>',
          'uniforms.reload'
        ]
      }),
      scene.constructOperator({
        operatorName: 'freeObjParsedData',
        srcFile: 'FABRIC_ROOT/SceneGraph/KL/loadObj.kl',
        entryFunctionName: 'freeObjParsedData',
        parameterLayout: [
          'uniforms.handle'
        ]
      })
    ]);
    /////////////////////////////////////////////////////////////////////

    trianglesNode.pub.getResourceLoadNode = function() {
      return resourceLoadNode;
    };

    emptyBindingsFunction = function() {
      trianglesNode.getAttributesDGNode().bindings.empty();
    };

    resourceLoadNode.pub.addOnLoadSuccessCallback(emptyBindingsFunction);
    resourceLoadNode.pub.addOnLoadFailureCallback(emptyBindingsFunction);

    return trianglesNode;
  }
});


FABRIC.SceneGraph.registerParser('obj', function(scene, assetUrl, options) {
  
  var results = {};
  var assetName = assetUrl.split('/').pop().split('.')[0];
  
  options.url = assetUrl;
  results[options.baseName] = scene.constructNode('ObjLoadTriangles', options);
  return results;
});

