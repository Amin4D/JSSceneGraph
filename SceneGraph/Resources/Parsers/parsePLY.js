
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//

FABRIC.SceneGraph.registerParser("ply", function(scene, assetFile, options ) {
    
    var objText = FABRIC.loadResourceURL(assetFile, "text/plain");
    
    var assets = {};
    var parseResults;
    if(options.sliceData){
      parseResults = [];
    }
    else{
      parseResults = {
        positions: [],
        vertexColors: [],
        indices: []
      }
    }
    
    var lines = objText.split('\n');
    if(lines.length <= 1) {
      lines = objText.split('\r');
    }
  
    if(lines.length <= 1) {
      if(onFailFn){
        onFailFn("Incorect obj file encoding");
      }
      return;
    }
  
    var lineNumber = 0;
    var numpoints = 0;
    var skip = 1;
    while (lineNumber < lines.length) {
      
      // TODO: Merge the following 2 regex
      var line = lines[ lineNumber ].replace(/^\s+|\s+$/g, '').replace(/#.*/, '');
      
      var items = line.split(' ');
      var type = items[0];
      
      switch(type.toLowerCase()){
        case 'ply':
          break;
        case 'type':
          break;
        case 'format':
          break;
        case 'element':
          numpoints = parseInt(items.pop());
           if(options.maxpoints){
            skip = Math.floor(numpoints/options.maxpoints);
          }
          break;
        case 'property':
          break;
        case 'end_header':
          lineNumber++;
          var pointIndex = 0;
          while (lineNumber < (lines.length-1)) {
            var line = lines[ lineNumber ].replace(/^\s+|\s+$/g, '').replace(/#.*/, '');
            items = line.split(' ');
            var pos = FABRIC.RT.vec3(parseFloat(items[0]), parseFloat(items[1]), parseFloat(items[2]));
            var color = FABRIC.RT.rgb255(parseFloat(items[6]), parseFloat(items[7]), parseFloat(items[8]));
            pos = options.xfo.ori.rotateVector(pos);
            pos.mulInPlace(options.xfo.sc);
            pos.addInPlace(options.xfo.tr);
            if(options.sliceData){
              parseResults.push({ positions:pos, indices:pointIndex});
            }
            else{
              parseResults.positions.push(pos);
              parseResults.vertexColors.push(color); 
              parseResults.indices.push(pointIndex); 
            }
            
            lineNumber += skip;
            pointIndex++;
          }
          break;
      }
      ++lineNumber;
    }
    
    
    var assetNode = scene.constructNode("Points");
    assetNode.addVertexAttributeValue("vertexColors", "Color", { genVBO:true } );
    assetNode.loadGeometryData(parseResults, "object");
    assets[options.baseName] = assetNode;
    
    return assets;
  });
  
  
