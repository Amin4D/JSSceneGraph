
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//

FABRIC.SceneGraph.registerParser('obj', function(scene, assetUrl, options) {
  
  var results = {};
  var assetName = assetUrl.split('/').pop().split('.')[0];
  
  options.url = assetUrl;
  results[options.baseName] = scene.constructNode('ObjLoadTriangles', options);
  return results;
});

