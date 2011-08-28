
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//

FABRIC.SceneGraph.registerParser('mtl', function(scene, assetFile, options) {

  var materialName,
    materialData = {},
    results = {};


  var onMaterialParsed = function(data, assetName) {
    if (options.skipNodes && options.skipNodes.indexOf(assetName) != -1) {
      return;
    }
    var materialOptions = {};
    for (i in options.materialOptions) {
      materialOptions[i] = options.materialOptions[i];
    }
    for (i in options.materialMaps) {
      materialOptions[options.materialMaps[i]] = data[options.materialMaps[i]];
    }
    var graphNode = scene.createNode(options.materialType, materialOptions);
    results[assetName] = graphNode;
  }


  var objText = FABRIC.loadResourceURL(assetFile, 'text/plain');
  var lines = objText.split('\n');
  if (lines.length <= 1) {
    lines = objText.split('\r');
  }

  if (lines.length <= 1) {
    if (onFailFn) {
      onFailFn('Incorect obj file encoding');
    }
    return;
  }


  var numLines = lines.length;
  var numSubAssets = 0;
  var lineNumber = 0;
  while (lineNumber < numLines) {
    var line = lines[lineNumber].replace(/^\s+|\s+$/g, '');
    ++lineNumber;
    if (line.length <= 1 || line[0] == '#') {
      continue;
    }
    var items = line.split(/\s* \s*/);

    if (items[0] == 'newmtl') {
      if (materialName) {
        onMaterialParsed(materialData, materialName);
      }
      materialName = items[1];
    }
    // Here we map values in the MTL file with properties and maps in the material.
    else if (options.materialProperties && options.materialProperties[items[0]]) {
      if (!options.skipNodes || options.skipNodes.indexOf(materialName) === -1) {
        materialData[options.materialProperties[items[0]]] = parseFloat(items[1]);
      }
    }
    else if (options.materialMaps && options.materialMaps[items[0]]) {
      if (!options.skipNodes || options.skipNodes.indexOf(materialName) === -1) {
        materialData[options.materialMaps[items[0]]] = scene.createNode('Image', { url: items[1] });
      }
    }
  }

  if (materialName) {
    onMaterialParsed(materialData, materialName);
  }

  return results;
});


