
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//

//////////////////////////////////////////////////////////////////////////////
// The SceneSaver is a tool for writing out all the data for a collection
// of nodes that the developer wishes to save.
// Note: it is the responsibility of the developer to determine which nodes
// need to be persisted and which ones done't.
// For example, a scene graph might always construct a Viewport or Grid object
// which shouldn't be persisted.
//
// Example usage
//   var sceneSaver = FABRIC.SceneGraph.constructSceneSaver(scene);
//  for(i in savableNodes){
//    sceneSaver.addNode(savableNodes[i]);
//  }
//  // Now put the data somewhere. Maybe in a database or file.
//  FABRIC.FS.write(sceneSaver.save());

/**
 * Constructor for a SceneSaver object.
 * @param {object} scene The scene to save.
 * @return {object} The created SceneSaver object.
 */
FABRIC.SceneGraph.constructSceneSaver = function(scene) {

  var savedNodes = [];

  var SceneSaver = function() {

  }
  SceneSaver.prototype = {
    addNode: function(node) {
      if (!node || !node.isTypeOf || !node.isTypeOf('SceneGraphNode')) {
        throw 'SceneSaver can only save SceneGraphNodes';
      }
      savedNodes.push(node);
      return node;
    },
    isNodeBeingSaved: function(node) {
      return (savedNodeMap[node.name] !== undefined);
    },
    wrapQuotes: function(val) {
      return '\"' + ((typeof val === 'string') ? val : val.toString()) + '\"';
    },
    save: function(writer) {
      var str = '[';
      for (var i = 0; i < savedNodes.length; i++) {
        var node = savedNodes[i];

        if (i > 0) {
          str += ',';
        }

        str += '\n\t{';

        str += '\n\t\t\"name\":' + this.wrapQuotes(node.name);
        str += ',\n\t\t\"type\":' + this.wrapQuotes(node.type);

        str += ',\n\t\t\"properties\":{';
        var first = true;
        for (propName in node) {
          if (propName !== 'name' && propName !== 'type' && typeof node[propName] !== 'function') {
            var propValue = node[propName];
            if (propValue.getType || (typeof node) == 'string') {
              str += (first ? '\n' : ',\n') + '\t\t\t' + this.wrapQuotes(propName) + ':' + this.wrapQuotes(propValue);
            }
            else if ((typeof node) == 'number' || (typeof node) == 'boolean') {
              str += (first ? '\n' : ',\n') + '\t\t\t' + this.wrapQuotes(propName) + ':' + propValue;
            }
            first = false;
          }
        }
        str += '\n\t\t}';

        var constructionOptions = {};
        var nodeData = {};
        if (node.writeData) {
          node.writeData(this, constructionOptions, nodeData);
          str += ',\n\t\t\"options\":' + JSON.stringify(constructionOptions);
          str += ',\n\t\t\"data\":' + JSON.stringify(nodeData);
        }
        str += '\n\t}';

      }
      str += '\n]';
      writer.write(str);
      return true;
    }
  };
  return new SceneSaver();
};


//////////////////////////////////////////////////////////////////////////////
// The SceneLoader is a tool for loading a collection of nodes and
// re-binding dependencies.
//
// Example usage
//   var sceneLoader = FABRIC.SceneGraph.constructSceneLoader(scene, FABRIC.loadResourceURL(file));
//  var loadedNodes = sceneLoader.load();

/**
 * Constructor for a SceneLoader object.
 * @param {object} scene The scene to load into.
 * @param {object} reader The reader object to read from.
 * @return {object} The created SceneLoader object.
 */
FABRIC.SceneGraph.constructSceneLoader = function(scene, reader) {
  var dataObj = JSON.parse(reader.read());
  var preLoadedNodes = {};

  var constructedNodeMap = {};
  var nodeNameRemapping = {};

  var SceneLoader = function() {

  }
  SceneLoader.prototype = {
    preLoadNode: function(node) {
      preLoadedNodes[node.name] = node;
    },
    getNode: function(nodeName) {
      if (preLoadedNodes[nodeName]) {
        return preLoadedNodes[nodeName];
      }else if (constructedNodeMap[nodeName]) {
        return constructedNodeMap[nodeName];
      }else {
        return scene.getSceneGraphNode(nodeName);
      }
    },
  /*  getLoadedNode:function(nodeName){
      if(nodeNameRemapping[ nodeName ]){
        return constructedNodeMap[ nodeNameRemapping[ nodeName ] ];
      }else{
        return constructedNodeMap[ nodeName ];
      }
    },
  */ load: function() {
      for (var i = 0; i < dataObj.length; i++) {
        var nodeData = dataObj[i];
        var options = nodeData.options;
        if (!options) options = {};
        options.name = nodeData.name;
        var node = preLoadedNodes[nodeData.name];
        if (!node) {
          node = scene.createNode(nodeData.type, options);
        }
      //  if(constructedNodeMap[ node.name ]){
      //    // TODO:Generate a unique name, and rename this node.
      //    // Store a remapping table, which gets passed into the postload callbacks.
      //    nodeNameRemapping[ node.name ] = newuniquename;
      //    node.name = newuniquename;
      //  }

        for (propName in nodeData.properties) {
        //  if(nodeData.properties[propName].substring(0, 10) == "FABRIC.RT"){
        //    node[propName] = eval(nodeData.properties[propName]);
        //  }else{
        //
        //  }
          try {

            if ((typeof nodeData.properties[propName]) == 'string') {
              node[propName] = eval(nodeData.properties[propName]);
            }else {
              node[propName] = nodeData.properties[propName];
            }

          }
          catch (e) {
            console.log('Error setting ' + propName + ' :' + e);
          }
        }

        constructedNodeMap[node.name] = node;
      }

      // The postload callbacks are usefull for re-connecting dependencies.
      // Each node can now get any dependcies and re connect them.
      for (var i = 0; i < dataObj.length; i++) {
        var nodeData = dataObj[i];
        var nodeName = nodeData.name;
        var node = constructedNodeMap[nodeName];
        if (nodeData && nodeData.data && node.readData) {
          node.readData(this, nodeData.data);
        }
      }
      return constructedNodeMap;
    }
  };
  return new SceneLoader();

};

/**
 * Constructor to create a logWriter object.
 * @constructor
 */
FABRIC.SceneGraph.logWriter = function() {
  this.write = function(str) {
    console.log(str);
  }

};

/**
 * Constructor to create a FileWriter object.
 * @constructor
 * @param {string} filepath The path to the file to write to.
 */
FABRIC.SceneGraph.FileWriter = function(filepath) {

  // Here we write out a file relative to the folder where the
  // document location.
  var dir;
  var pathSections = document.location.href.split('/');
  while (pathSections[0] !== 'Projects') { pathSections.splice(0, 1); }
  pathSections.splice(0, 1);

  // Now navigate to the folder that the project is stored in.
  var dir = new FABRIC.IO.Dir(FABRIC.IO.root, 'Projects');
  while (pathSections.length > 1) {
    dir = new FABRIC.IO.Dir(dir, pathSections[0]);
    pathSections.splice(0, 1);
  }

  var pathSections = filepath.split('/');
  if (pathSections[0] == '.') {
    pathSections.splice(0, 1);
  }
  var fileName = pathSections.pop();
  while (pathSections.length > 0) {
    dir = new FABRIC.IO.Dir(dir, pathSections[0]);
    pathSections.splice(0, 1);
  }

  this.write = function(str) {
  //  console.log(str);
    dir.putFileContents(fileName, str);
  }

};

/**
 * Constructor to create a FileReader object.
 * @constructor
 * @param {string} filepath The path to the file to read from.
 */
FABRIC.SceneGraph.FileReader = function(filepath) {

  // Here we write out a file relative to the folder where the
  // document location.
  var dir;
  var pathSections = document.location.href.split('/');
  while (pathSections[0] !== 'Projects') { pathSections.splice(0, 1); }
  pathSections.splice(0, 1);

  // Now navigate to the folder that the project is stored in.
  var dir = new FABRIC.IO.Dir(FABRIC.IO.root, 'Projects');
  while (pathSections.length > 1) {
    dir = new FABRIC.IO.Dir(dir, pathSections[0]);
    pathSections.splice(0, 1);
  }

  var pathSections = filepath.split('/');
  if (pathSections[0] == '.') {
    pathSections.splice(0, 1);
  }
  var fileName = pathSections.pop();
  while (pathSections.length > 0) {
    dir = new FABRIC.IO.Dir(dir, pathSections[0]);
    pathSections.splice(0, 1);
  }

  this.read = function(str) {
  //  console.log(dir.getFileContents(fileName));
    return dir.getFileContents(fileName);
  }

};



