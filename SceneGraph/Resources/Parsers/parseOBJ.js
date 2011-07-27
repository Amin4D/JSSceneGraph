
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//

FABRIC.SceneGraph.registerParser('obj', function(scene, assetFile, options) {


  var objText = FABRIC.loadResourceURL(assetFile, 'text/plain');

  // we need to have filedata
  var results = {};
  var positions = [];
  var normals = [];
  var textureCoords = [];
  var subObjectName = '';
  var subObjectMaterialName;
  var scaleFactor = options.scaleFactor ? options.scaleFactor : 1.0;

  var meshData = {
    positions: [],
    normals: [],
    indices: []
  };

  var onMeshParsed = function(data, assetName, materialName) {
    if (options.skipNodes && options.skipNodes.indexOf(assetName) != -1) {
      return;
    }
    var meshOptions = {};
    if (data.uvs0) {
      meshOptions.uvSets = 1;
    }
    var graphNode = scene.constructNode('Triangles', meshOptions);
    graphNode.loadGeometryData(data);
    results[assetName] = graphNode;
    if (materialName) {
      // I don't like this soluton. We shouldn't append stuff to a node like this,
      // but I'm not sure else how to export the meterial relationship.
    //  assetName = assetName + materialName
      results[assetName].materialName = materialName;
    }
  }

  var nextVertex = function(items, vertexIndex) {
    var indicesStr = items[vertexIndex];
    if (!indicesStr)
      return null;
    var indices = indicesStr.split('/');
    var subIndex = 0;
    var result = {
    };

    try {
      var index = parseInt(indices[subIndex]);
      if (index < 0) {
        index += positions.length;
      }else {
        --index;
      }
      if (index < 0 || index >= positions.length || isNaN(index)) {
        throw 'index out of range';
      }
      result.position = positions[index];
      subIndex++;
    }
    catch (err) {
      throw 'malformed face element (position): ' + err;
    }

    try {
      if (subIndex < indices.length && indices[subIndex].length > 0) {
        var index = parseInt(indices[subIndex]);
        if (index < 0)
          index += textureCoords.length;
        else
          --index;
        if (index < 0 || index >= textureCoords.length)
          throw 'index out of range';
        result.textureCoord = textureCoords[index];
      }
      subIndex++;
    }
    catch (err) {
      throw 'malformed face element (texture coord): ' + err;
    }

    try {
      if (subIndex < indices.length) {
        var index = parseInt(indices[subIndex]);
        if (index < 0)
          index += normals.length;
        else
          --index;
        if (index < 0 || index >= normals.length)
          throw 'index out of range';
        result.normal = normals[index];
      }
      subIndex++;
    }
    catch (err) {
      throw 'malformed face element (normal): ' + err;
    }

    return result;
  };

/*  var subObjectNames = [];
  var generateUniqueSubObjectName = function(){
    subObjectName = subObjectName.replace(/[^a-zA-Z 0-9]+/g,'')
    var suffix = "";
    var suffixID = 0;
    while(subObjectNames.indexOf(subObjectName + suffix) !== -1){
      suffixID++;
      suffix = suffixID.toString();
    }
    subObjectNames.push(subObjectName + suffix);
    return subObjectName + suffix;
  }
*/
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
    var line = lines[lineNumber];
    ++lineNumber;
    if (line.length <= 1 || line[0] == '#') {
      continue;
    }
    var items = line.split(/\s* \s*/);

    switch (items[0]) {
    case 'g':
      if (options.returnSubMeshes === true) {
        if (meshData.positions.length > 0) {
          onMeshParsed(meshData, subObjectName, subObjectMaterialName);
        }
        subObjectName = items[1];
        meshData = {
          positions: [],
          normals: [],
          indices: []
        };
        numSubAssets++;
      }
      break;
    case 'usemtl':
      subObjectMaterialName = items[1];
      break;
    case 'v':
      var p1 = parseFloat(items[1]);
      var p2 = parseFloat(items[2]);
      var p3 = parseFloat(items[3]);
      if (!isNaN(p1) && !isNaN(p2) && !isNaN(p3)) {
        positions.push(new FABRIC.RT.Vec3(p1*scaleFactor, p2*scaleFactor, p3*scaleFactor));
      }
      else {
        throw 'Malformed vertex on line ' + lineNumber;
      }
      break;
    case 'vt':
      var tc1 = parseFloat(items[1]);
      var tc2 = parseFloat(items[2]);
      if (!isNaN(tc1) && !isNaN(tc2)) {
        textureCoords.push(new FABRIC.RT.Vec2(tc1, tc2));
      }
      else {
      //  throw "Malformed texture coord on line " + lineNumber;
        console.warn('Malformed texture coord on line ' + lineNumber + ' :' + unfilteredLine);
        textureCoords.push(new FABRIC.RT.Vec2(0.5, 0.5));
      }
      break;
    case 'vn':
      var n1 = parseFloat(items[1]);
      var n2 = parseFloat(items[2]);
      var n3 = parseFloat(items[3]);
      if (!isNaN(n1) && !isNaN(n2) && !isNaN(n3)) {
        normals.push(new FABRIC.RT.Vec3(n1, n2, n3));
      }
      else {
        throw 'Malformed normal on line ' + lineNumber;
      }
      break;
    case 'f':
      var vertexIndex = 1;
      var firstVertex;
      try {
        firstVertex = nextVertex(items, vertexIndex);
        if (!firstVertex) {
          throw 'missing first vertex';
        }
        vertexIndex++;
      }
      catch (err) {
        throw 'line ' + lineNumber + ': ' + err;
      }
      var firstIndex = null;

      var lastVertex;
      try {
        lastVertex = nextVertex(items, vertexIndex);
        if (!lastVertex) {
          throw 'missing second vertex';
        }
        vertexIndex++;
      }
      catch (err) {
        throw 'line ' + lineNumber + ': ' + err;
      }
      var lastIndex = null;

      while (vertexIndex < items.length) {
        var vertex;
        try {
          vertex = nextVertex(items, vertexIndex);
          vertexIndex++;
        }
        catch (err) {
          throw 'line ' + lineNumber + ': ' + err;
        }
        if (!vertex)
          break;

        if (!firstIndex) {
          if (!('normal' in firstVertex)) {
            firstVertex.normal = lastVertex.position
                                           .subtract(firstVertex.position)
                                           .cross(vertex.position.subtract(firstVertex.position));
          }
          firstIndex = meshData.positions.length;
          meshData.positions.push(firstVertex.position);
          meshData.normals.push(firstVertex.normal);
          if (firstVertex.textureCoord) {
            if (!meshData.uvs0) {
              meshData.uvs0 = [];
            }
            meshData.uvs0.push(firstVertex.textureCoord);
          }
        }
        meshData.indices.push(firstIndex);

        if (!lastIndex) {
          if (!('normal' in lastVertex)) {
            lastVertex.normal = firstVertex.normal;
          }
          lastIndex = meshData.positions.length;
          meshData.positions.push(lastVertex.position);
          meshData.normals.push(lastVertex.normal);
          if (lastVertex.textureCoord) {
            meshData.uvs0.push(lastVertex.textureCoord);
          }
        }
        meshData.indices.push(lastIndex);

        if (!('normal' in vertex)) {
          vertex.normal = firstVertex.normal;
        }
        var index = meshData.positions.length;
        meshData.positions.push(vertex.position);
        meshData.normals.push(vertex.normal);
        if (vertex.textureCoord) {
          meshData.uvs0.push(vertex.textureCoord);
        }
        meshData.indices.push(index);

        lastIndex = index;
      }
      break;
    default: continue;
    }
  }

  if (meshData.positions.length > 0) {
    if (options.returnSubMeshes === true && numSubAssets > 0) {
      onMeshParsed(meshData, subObjectName, subObjectMaterialName);
    }else {
      onMeshParsed(meshData, options.baseName, subObjectMaterialName);
    }
  }

  return results;
});


