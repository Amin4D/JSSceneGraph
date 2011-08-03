
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//

FABRIC.SceneGraph.registerParser('obj', function(scene, assetUrl, options) {
  
  var results = {};
  var assetName = assetUrl.split('/').pop().split('.')[0];
  
  results[options.baseName] = scene.constructNode('ObjLoadTriangles', {
      url: assetUrl
    });
  return results;
});

