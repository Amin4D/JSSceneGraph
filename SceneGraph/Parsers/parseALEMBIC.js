
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//

FABRIC.SceneGraph.registerParser('abc', function(scene, assetUrl, options) {
  
  var results = {};
  var assetName = assetUrl.split('/').pop().split('.')[0];
  
  options.url = assetUrl;
  results[options.baseName] = scene.constructNode('AlembicLoadNode', options);
  return results;
});

