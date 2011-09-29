
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//

FABRIC.SceneGraph.registerParser('dae', function(scene, assetFile, options) {
  
  if(!options.constructMaterialNodes) options.constructMaterialNodes = false;

  var assetNodes = {};
  var warn = function( warningText ){
  //  console.warn(warningText);
  }
  
  //////////////////////////////////////////////////////////////////////////////
  // Collada File Parsing Functions

  var parseLibaryEffects = function(node) {
  }
  
  var parseLibaryMaterials = function(node) {
  }
  
  var parseAccessor = function(node){
    var accessor = {
      source: node.getAttribute('source'),
      count: parseInt(node.getAttribute('count')),
      stride: parseInt(node.getAttribute('stride')),
      params: []
    };
                
    var technique_common = {};
    var child = node.firstElementChild;
    while(child){
      switch (child.nodeName) {
        case 'param':
          accessor.params.push({
            name: child.getAttribute('name'),
            type: child.getAttribute('type')
          });
          break;
        default:
          warn("Warning in parseAccessor: Unhandled node '" +child.nodeName + "'");
      }
      child = child.nextElementSibling;
    }
    return accessor;
  }
  
  var parseTechniqueCommon = function(node){
    var technique_common = { };
    var child = node.firstElementChild;
    while(child){
      switch (child.nodeName) {
        case 'accessor':
          technique_common.accessor = parseAccessor(child);
          break;
        default:
          warn("Warning in parseTechniqueCommon: Unhandled node '" +child.nodeName + "'");
      }
      child = child.nextElementSibling;
    }
    return technique_common;
  }
  
  var parseSource = function(node){
    var val, source = {
      data: [],
      technique: undefined
    };
    var child = node.firstElementChild;
    while(child){
      switch (child.nodeName) {
        case 'float_array':
          var count = parseInt(child.getAttribute('count'));
          var text_array = child.textContent.split(new RegExp("\\s+"));
          for(var i=0; i<text_array.length; i++){
            if(text_array[i] != ""){
              source.data.push(parseFloat(text_array[i]));
            }
          }
          if(source.data.length != count){
            throw 'Error splitting source data array';
          }
          break;
        case 'Name_array':
          var count = parseInt(child.getAttribute('count'));
          var text_array = child.textContent.split(new RegExp("\\s+"));
          for(var i=0; i<text_array.length; i++){
            if(text_array[i] != ""){
              source.data.push(text_array[i]);
            }
          }
          if(source.data.length != count){
            throw 'Error splitting source data array';
          }
          break;
        case 'IDREF_array':
          var count = parseInt(child.getAttribute('count'));
          var text_array = child.textContent.split(new RegExp("\\s+"));
          for(var i=0; i<text_array.length; i++){
            if(text_array[i] != ""){
              source.data.push(text_array[i]);
            }
          }
          if(source.data.length != count){
            throw 'Error splitting source data array';
          }
          break;
        case 'technique_common':
          source.technique = parseTechniqueCommon(child);
          break;
        default:
          warn("Warning in parseSource: Unhandled node '" +child.nodeName + "'");
      }
      child = child.nextElementSibling;
    }
    return source;
  }
  
  var parseInput = function(node){
    var input = {
      'semantic': node.getAttribute('semantic'),
      'source': node.getAttribute('source')
    };
    if(node.getAttribute('offset')){
      input.offset = parseInt(node.getAttribute('offset'));
    }
    if(node.getAttribute('set')){
      input.set = parseInt(node.getAttribute('set'));
    }
    return input;
  }
  
  var parseSampler = function(node) {
    var inputs = {};
    var child = node.firstElementChild;
    while(child){
      switch (child.nodeName) {
        case 'input':
          inputs[child.getAttribute('semantic')] = parseInput(child);
          break;
        default:
          warn("Warning in parseLibaryGeometries: Unhandled node '" +child.nodeName + "'");
      }
      child = child.nextElementSibling;
    }
    return inputs;
  }
  
  var parseAnimation = function(node, channelMap) {
    var animationData = {
      sources: {}
      };
    var child = node.firstElementChild;
    while(child){
      switch (child.nodeName) {
        case 'source':
          animationData.sources[child.getAttribute('id')] = parseSource(child);
          break;
        case 'sampler':
          animationData.sampler = parseSampler(child);
          break;
        case 'channel':
          animationData.channel = {
            source: child.getAttribute('source'),
            target: child.getAttribute('target')
          }
          break;
        default:
          warn("Warning in parseAnimation: Unhandled node '" +child.nodeName + "'");
      }
      child = child.nextElementSibling;
    }
    var targetNodeName = animationData.channel.target.split('/')[0];
    var targetChannelName = animationData.channel.target.split('/')[1];
    
    if(!channelMap[targetNodeName]){
      channelMap[targetNodeName] = {};
    }
    channelMap[targetNodeName][targetChannelName] = animationData;
    
    return animationData;
  }
  
  var parseLibaryAnimations = function(node) {
    var libraryAnimations = {
      animations: [], /* array of all animation channels */
      channelMap: {} /* mapping of animation tracks to channels */
    };
    var child = node.firstElementChild;
    while(child){
      switch (child.nodeName) {
        case 'animation':
          // Note: collada files exported from 3dsmax have an extra level here
          // where animation is nested under animation. it also has a 'name'
          // attribute for the name of the target node. 
          if(child.firstElementChild.nodeName == 'animation'){
            child = child.firstElementChild;
          }
          libraryAnimations.animations[child.getAttribute('id')] = parseAnimation(child, libraryAnimations.channelMap);
          break;
        default:
          warn("Warning in parseLibaryGeometries: Unhandled node '" +child.nodeName + "'");
      }
      child = child.nextElementSibling;
    }
    return libraryAnimations;
  }
  
  var parsePolygons = function(node){
    var polygons = {
      count: parseInt(node.getAttribute('count')),
      inputs: {},
      indices: []
    };
    var child = node.firstElementChild;
    while(child){
      switch (child.nodeName) {
        case 'input':
          polygons.inputs[child.getAttribute('semantic')] = parseInput(child);
          break;
        case 'p':
          var text_array = child.textContent.split(new RegExp("\\s+"));
          for(var i=0; i<text_array.length; i++){
            if(text_array[i] != ""){
              polygons.indices.push(parseFloat(text_array[i]));
            }
          }
          break;
        default:
          warn("Warning in parsePolygons: Unhandled node '" +child.nodeName + "'");
      }
      child = child.nextElementSibling;
    }
    return polygons;
  }
  
  var parseMesh = function(node){
    var mesh = {
      sources: {},
      vertices: {}
    };
    
    var child = node.firstElementChild;
    while(child){
      switch (child.nodeName) {
        case 'source':
          mesh.sources[child.getAttribute('id')] = parseSource(child);
          break;
        case 'vertices':
          mesh.vertices = parseInput(child.firstElementChild);
          break;
        case 'polygons':
          if(!mesh.polygons) mesh.polygons = [];
          mesh.polygons.push(parsePolygons(child));
          break;
        case 'triangles':
          if(!mesh.triangles) mesh.triangles = [];
          mesh.triangles.push(parsePolygons(child));
          break;
        default:
          warn("Warning in parseMesh: Unhandled node '" + child.nodeName + "'");
      }
      child = child.nextElementSibling;
    }
    return mesh;
  }
  
  var parseGeometry = function(node){
    var geometry = {
      name: node.getAttribute('name')
    };
    var child = node.firstElementChild;
    while(child){
      switch (child.nodeName) {
        case 'mesh':
          geometry.mesh = parseMesh(child);
          break;
        default:
          warn("Warning in parseGeometry: Unhandled node '" + child.nodeName + "'");
      }
      child = child.nextElementSibling;
    }
    return geometry;
  }
  
  var parseLibaryGeometries = function(node) {
    var libraryGeometries = {};
    var child = node.firstElementChild;
    while(child){
      switch (child.nodeName) {
        case 'geometry':
          libraryGeometries[child.getAttribute('id')] = parseGeometry(child);
          break;
        default:
          warn("Warning in parseLibaryGeometries: Unhandled node '" +child.nodeName + "'");
      }
      child = child.nextElementSibling;
    }
    return libraryGeometries;
  }
  
  var parseVertexWeights = function(node) {
    var vertexWeights = {
      count: parseInt(node.getAttribute('count')),
      inputs: {},
      vcounts: [],
      indices: []
    };
    var child = node.firstElementChild;
    while(child){
      switch (child.nodeName) {
        case 'input':
          vertexWeights.inputs[child.getAttribute('semantic')] = parseInput(child);
          break;
        case 'vcount':
          var text_array = child.textContent.split(new RegExp("\\s+"));
          for(var i=0; i<text_array.length; i++){
            if(text_array[i] != ""){
              vertexWeights.vcounts.push(parseInt(text_array[i]));
            }
          }
          break;
        case 'v':
          var text_array = child.textContent.split(new RegExp("\\s+"));
          for(var i=0; i<text_array.length; i++){
            if(text_array[i] != ""){
              vertexWeights.indices.push(parseInt(text_array[i]));
            }
          }
          break;
        default:
          warn("Warning in parseVertexWeights: Unhandled node '" +child.nodeName + "'");
      }
      child = child.nextElementSibling;
    }
    return vertexWeights;
  }
  
  var parseJoints = function(node) {
    var joints = {};
    var child = node.firstElementChild;
    while(child){
      switch (child.nodeName) {
        case 'input':
          joints[child.getAttribute('semantic')] = parseInput(child);
          break;
        default:
          warn("Warning in parseJoints: Unhandled node '" +child.nodeName + "'");
      }
      child = child.nextElementSibling;
    }
    return joints;
  }
  
  var parseSkin = function(node) {
    var skin = {
      source: node.getAttribute('source'),
      sources: {},
      joints: []
    };
    var child = node.firstElementChild;
    while(child){
      switch (child.nodeName) {
        case 'bind_shape_matrix':
          var text_array = child.textContent.split(new RegExp("\\s+"));
          var float_array = [];
          for(var i=0; i<text_array.length; i++){
            if(text_array[i] != ""){
              float_array.push(parseFloat(text_array[i]));
            }
          }
          var matrix44 = FABRIC.RT.mat44.apply(undefined, float_array);
          skin.bind_shape_matrix = matrix44.transpose();
          break;
        case 'source':
          skin.sources[child.getAttribute('id')] = parseSource(child);
          break;
        case 'vertex_weights':
          skin.vertex_weights  = parseVertexWeights(child);
          break;
        case 'joints':
          skin.joints = parseJoints(child);
          break;
        default:
          warn("Warning in parseSkin: Unhandled node '" +child.nodeName + "'");
      }
      child = child.nextElementSibling;
    }
    return skin;
  }
  
  var parseController = function(node) {
    var controller = {};
    var child = node.firstElementChild;
    while(child){
      switch (child.nodeName) {
        case 'skin':
          controller.skin = parseSkin(child);
          break;
        default:
          warn("Warning in parseController: Unhandled node '" +child.nodeName + "'");
      }
      child = child.nextElementSibling;
    }
    return controller;
  }
  
  var parseLibaryControllers = function(node) {
    var libraryControllers = {};
    var child = node.firstElementChild;
    while(child){
      switch (child.nodeName) {
        case 'controller':
          libraryControllers[child.getAttribute('id')] = parseController(child);
          break;
        default:
          warn("Warning in parseLibaryControllers: Unhandled node '" +child.nodeName + "'");
      }
      child = child.nextElementSibling;
    }
    return libraryControllers;
  }
  
  var parseInstanceGeometry = function(node) {
    var instanceController = {
      url: node.getAttribute('url')
      };
    var child = node.firstElementChild;
    while(child){
      switch (child.nodeName) {
        default:
          warn("Warning in parseInstanceGeometry: Unhandled node '" +child.nodeName + "'");
      }
      child = child.nextElementSibling;
    }
    return instanceController;
  }
  
  var parseInstanceController = function(node) {
    var instanceController = {
      url: node.getAttribute('url')
      };
    var child = node.firstElementChild;
    while(child){
      switch (child.nodeName) {
        default:
          warn("Warning in parseInstanceController: Unhandled node '" +child.nodeName + "'");
      }
      child = child.nextElementSibling;
    }
    return instanceController;
  }
  
  var parseNode = function(node, nodeLibrary, parentId) {
    var nodeData = {
      name:  node.getAttribute('name'),
      type:  node.getAttribute('type'),
      instance_geometry: undefined,
      xfo: new FABRIC.RT.Xfo(),
      children:[]
    };
    if(parentId){
      nodeData.parentId = parentId;
    }
    var id = node.getAttribute('id');
    var child = node.firstElementChild;
    while(child){
      switch (child.nodeName) {
        case 'translate': {
          var sid = child.getAttribute('sid');
          var str = child.textContent.split(new RegExp("\\s+"));
          var tr = new FABRIC.RT.Vec3(parseFloat(str[0]), parseFloat(str[1]), parseFloat(str[2]));
          nodeData.xfo = nodeData.xfo.multiply(new FABRIC.RT.Xfo({tr:tr}));
          break;
        }
        case 'rotate': {
          var sid = child.getAttribute('sid');
          var str = child.textContent.split(new RegExp("\\s+"));
          var q = new FABRIC.RT.Quat().setFromAxisAndAngle(
                    new FABRIC.RT.Vec3(
                      parseFloat(str[0]),
                      parseFloat(str[1]),
                      parseFloat(str[2])),
                    Math.degToRad(parseFloat(str[3])));
          nodeData.xfo = nodeData.xfo.multiply(new FABRIC.RT.Xfo({ori:q}));
          break;
        }
        case 'scale': {
          var sid = child.getAttribute('sid');
          var str = child.textContent.split(new RegExp("\\s+"));
          var sc = new FABRIC.RT.Vec3(parseFloat(str[0]), parseFloat(str[1]), parseFloat(str[2]));
          nodeData.xfo = nodeData.xfo.multiply(new FABRIC.RT.Xfo({sc:sc}));
          break;
        }
        case 'instance_geometry':
          nodeData.instance_geometry = parseInstanceGeometry(child);
          break;
        case 'instance_controller':
          nodeData.instance_controller = parseInstanceController(child);
          break;
        case 'node':
          nodeData.children.push(parseNode(child, nodeLibrary, id));
          break;
        default:
          warn("Warning in parseNode: Unhandled node '" +child.nodeName + "'");
      }
      child = child.nextElementSibling;
    }
    nodeLibrary[node.getAttribute('id')] = nodeData;
    return nodeData;
  }
  
  var parseVisualScene = function(node) {
    var scene = {
      nodes: [],  /* Hierarchial scene representation */
      nodeLibrary: {} /* flat scene representation for quick node lookup */
    };
    var child = node.firstElementChild;
    while(child){
      switch (child.nodeName) {
        case 'node':
          scene.nodes.push(parseNode(child, scene.nodeLibrary));
          break;
        default:
          warn("Warning in parseVisualScene: Unhandled node '" +child.nodeName + "'");
      }
      child = child.nextElementSibling;
    }
    return scene;
  }
  
  var parseLibraryVisualScenes = function(node) {
    var scenes = {};
    var child = node.firstElementChild;
    while(child){
      switch (child.nodeName) {
        case 'visual_scene':
          scenes[child.getAttribute('id')] = parseVisualScene(child);
          break;
        default:
          warn("Warning in parseLibraryVisualScenes: Unhandled node '" +child.nodeName + "'");
      }
      child = child.nextElementSibling;
    }
    return scenes;
  }
  
  var parseScene = function(node) {
    var scene = {};
    var child = node.firstElementChild;
    while(child){
      switch (child.nodeName) {
        case 'instance_visual_scene':
          scene.url = child.getAttribute('url');
          break;
        default:
          warn("Warning in parseScene: Unhandled node '" +child.nodeName + "'");
      }
      child = child.nextElementSibling;
    }
    return scene;
  }
  
  var parseColladaBase = function(node) {
    var colladaData = {}
    var child = node.firstElementChild;
    while(child){
      switch (child.nodeName) {
        case 'asset': 
          break;
        case 'library_effects':
          colladaData.libraryEffects = parseLibaryEffects(child);
          break;
        case 'library_materials': 
          colladaData.libraryMaterials = parseLibaryMaterials(child);
          break;
        case 'library_animations': 
          colladaData.libraryAnimations = parseLibaryAnimations(child);
          break;
        case 'library_geometries': 
          colladaData.libraryGeometries = parseLibaryGeometries(child);
          break;
        case 'library_controllers': 
          colladaData.libraryControllers = parseLibaryControllers(child);
          break;
        case 'library_visual_scenes':
          colladaData.libraryVisualScenes = parseLibraryVisualScenes(child);
          break;
        case 'visual_scenes':
          colladaData.visualScenes = parseVisualScenes(child);
          break;
        case 'scene':
          colladaData.scene = parseScene(child);
          break;
        default:
          warn("Warning in parseColladaBase: Unhandled node '" +child.nodeName + "'");
      }
      child = child.nextElementSibling;
    }
    return colladaData;
  }
  
  var xmlText = FABRIC.loadResourceURL(assetFile, 'text/xml');
  var parser = new DOMParser();
  var xmlDoc = parser.parseFromString(xmlText, 'text/xml');
  
  // get the root and check its type
  var xmlRoot = xmlDoc.firstChild;
  if (xmlRoot.nodeName != 'COLLADA') {
    throw 'Collada file is corrupted.';
  }
  var colladaData = parseColladaBase(xmlRoot);
  
  //////////////////////////////////////////////////////////////////////////////
  // SceneGraph Construction
  /*
  var defaultLight = scene.constructNode('PointLight', { position: new FABRIC.RT.Vec3(420.0, 1000.0, 600.0) });
  var defaultMaterial = scene.constructNode('PhongMaterial', {
      diffuseColor: FABRIC.RT.rgb(0.8, 0, 0, 1),
      lightNode: defaultLight
    });
  */
  // This method returns an array of values from the given source data. 
  var getSourceData = function(source, id){
    var accessor = source.technique.accessor;
    var elemid = id * accessor.stride;
    return source.data.slice( elemid, elemid + accessor.stride );
  }
    
  var processGeometryData = function(meshData, trianglesData){
    var numTriangles = trianglesData.count;
    var attrcount = 0;
    var numUVsets = 0;
    var meshTriangleSourceData = {};
    var processedData = {
      constructionOptions: {},
      geometryData: {
        indices: []
      },
      vertexRemapping: []
    };
    for(var semantic in trianglesData.inputs){
      var input = trianglesData.inputs[semantic];
      var sourceName = input.source.slice(1);
      switch(semantic){
        case 'VERTEX':
          meshTriangleSourceData.positions = {
            source: meshData.sources[meshData.vertices.source.slice(1)],
            constructorFn: new FABRIC.RT.Vec3
          };
          processedData.geometryData.positions = [];
          break;
        case 'NORMAL':
          meshTriangleSourceData.normals = {
            source: meshData.sources[sourceName],
            constructorFn: new FABRIC.RT.Vec3
          };
          processedData.geometryData.normals = [];
          break;
        case 'TEXCOORD':
          var uvset = 'uvs' + numUVsets;
          meshTriangleSourceData[uvset] = {
            source: meshData.sources[sourceName],
            constructorFn: new FABRIC.RT.Vec2
          };
          processedData.geometryData[uvset] = [];
          processedData.constructionOptions.tangentsFromUV = numUVsets;
          numUVsets++;
          processedData.constructionOptions.uvSets = numUVsets;
          break;
        default:
          throw "Error: unhandled semantic '" + semantic +"'";
      }
      attrcount++
    }
    
    var indicesMapping = {};
    var vcount = 0;
    var vid = 0;
    for(var tid=0; tid<numTriangles; tid++){
      for(var j=0; j<3; j++){
        var attributeDataIndices = trianglesData.indices.slice( vid*attrcount, (vid*attrcount) + attrcount );
        var vertexMappingID = 'vid' + attributeDataIndices.join('_');
        // By using the attribute indices to generate a unique id for each vertex,
        // we can detect if a vertex is being reused. In the collada specification
        // all attributes have different counts, but in Fabric, all attributes have the
        // same count. To share a vertex, we must share all attribute data.
        if(!indicesMapping[vertexMappingID]){
          var vattrid = 0; // vertex attribute id
          for(var inputid in meshTriangleSourceData){
            var elementid = attributeDataIndices[vattrid];
            var sourceData = getSourceData(meshTriangleSourceData[inputid].source, elementid);
            var constructorFn = meshTriangleSourceData[inputid].constructorFn;
            processedData.geometryData[inputid].push(constructorFn.apply(undefined, sourceData));
            vattrid++;
          }
          processedData.geometryData.indices.push(vcount);
          indicesMapping[vertexMappingID] = vcount;
          // We are remapping the vertices, and need to keep track of this so we can remap other
          // vertex data such as bone weights and indices
          processedData.vertexRemapping[vcount] = attributeDataIndices[0];
          vcount++;
        }
        else{
          processedData.geometryData.indices.push(indicesMapping[vertexMappingID]);
        }
        vid++;
      }
    }
    return processedData;
  }
  
  var constructGeometry = function(geometryData){
    var name = geometryData.name;
    var geometryNode;
    if(geometryData.mesh){
      var meshData = geometryData.mesh;
      if(meshData.triangles){
        for(var i=0; i<meshData.triangles.length; i++){
          if(i>0){
            alert("This collada importer only supports one triangle mesh per instance.");
            throw "This collada importer only supports one triangle mesh per instance."
          }
          
          var processedData = processGeometryData(meshData, meshData.triangles[i]);
          processedData.constructionOptions.name = name+i
          var geometryNode = scene.constructNode('Triangles', processedData.constructionOptions);
          geometryNode.loadGeometryData(processedData.geometryData);
          assetNodes[processedData.constructionOptions.name] = geometryNode;
        }
      }
      if(meshData.polygons){
        for(var i=0; i<meshData.polygons.length; i++){
          if(i>0){
            alert("This collada importer only supports one polygon mesh per instance.");
            throw "This collada importer only supports one polygon mesh per instance."
          }
          
          var processedData = processGeometryData(meshData, meshData.polygons[i]);
          processedData.constructionOptions.name = name+i
          var geometryNode = scene.constructNode('Triangles', processedData.constructionOptions);
          geometryNode.loadGeometryData(processedData.geometryData);
          assetNodes[processedData.constructionOptions.name] = geometryNode;
        }
      }
    }
    else{
      alert("This collada importer only supports polygon and triangle meshes.");
      throw "This collada importer only supports polygon and triangle meshes."
    }
    return geometryNode;
  }

  var libraryRigs = {};
  var constructRigFromHierarchy = function(sceneData, rootNodeName, controllerName){
    if(!controllerName){
      controllerName = rootNodeName;
    }
    
    if(libraryRigs[rootNodeName]){
      return libraryRigs[rootNodeName];
    }
    
    // recurse on the hierarchy
    var boneIndicesMap = {};
    var bones = [];
    var traverseChildren = function(nodeData, parentName) {
      var boneOptions = { name: nodeData.name, parent: -1, length: 0 };
      boneIndicesMap[nodeData.name] = bones.length;
      if (parentName) {
        boneOptions.parent = boneIndicesMap[parentName];
      }
      boneOptions.referenceLocalPose = nodeData.xfo;
      if (boneOptions.parent !== -1) {
        boneOptions.referencePose = bones[boneOptions.parent].referencePose * nodeData.xfo;

        // set the length of the parent bone based on the child bone local offset.
        if(nodeData.xfo.tr.x > (Math.abs(nodeData.xfo.tr.y) + Math.abs(nodeData.xfo.tr.z)) &&
          nodeData.xfo.tr.x > bones[boneOptions.parent].length) {
          bones[boneOptions.parent].length = nodeData.xfo.tr.x;
        }
      }
      else {
        boneOptions.referencePose = nodeData.xfo;
      }
      bones.push(boneOptions);
      if (nodeData.children) {
        for (var i = 0; i < nodeData.children.length; i++) {
          traverseChildren(nodeData.children[i], nodeData.name);
        }
      }
    };
    traverseChildren(sceneData.nodeLibrary[rootNodeName]);
    // If any bones didn't get a size, then give them the length of the parent bone * 0.5
    for (i = 0; i < bones.length; i++) {
      if (bones[i].length === 0 && bones[i].parent != -1) {
        bones[i].length = bones[bones[i].parent].length * 0.5;
      }
      bones[i].radius = bones[i].length * 0.1;
    }
    
    var skeletonNode = scene.constructNode('CharacterSkeleton', {
      name:controllerName+"Skeleton",
      calcReferenceLocalPose: false,
      calcReferenceGlobalPose: false,
      calcInvMatricies: false
    });
    skeletonNode.setBones(bones);
    
    ///////////////////////////////
    // Rig Variables node
     
    
    var variablesNode = scene.constructNode('CharacterVariables', {
      name: controllerName+'Variables'
    });
    
    var rigNode = scene.constructNode('CharacterRig', {
        name: controllerName+'CharacterRig',
        skeletonNode: skeletonNode,
        variablesNode: variablesNode
      });
    
      
    if(colladaData.libraryAnimations){
      // fill in all of the tracks...
      var tracks = {
        name: [],
        color: [],
        keys: []
      };
      var binding = {};
      for (var i = 0; i < bones.length; i++) {
        var channels = colladaData.libraryAnimations.channelMap[bones[i].name];
        
        if (!channels)
          continue;
        
        for (var channelName in channels) {
          var animation = channels[channelName];
          var sampler = animation.sampler;
          
          if (!sampler.INPUT || !sampler.OUTPUT || !sampler.INTERPOLATION)
            throw "Animation Channel must provide 'INPUT', 'OUTPUT', and 'INTERPOLATION' sources";
          
          // allright - now we need to create the data
          // let's check the first element of the INTERPOLATION semantic
          var inputSource = animation.sources[sampler.INPUT.source.slice(1)];
          var outputSource = animation.sources[sampler.OUTPUT.source.slice(1)];
          var interpolationSource = animation.sources[sampler.INTERPOLATION.source.slice(1)];
          
          
          // ensure to convert ANGLE to RADIANS
          if (channelName.substr(channelName.lastIndexOf('.') + 1) == 'ANGLE') {
            for (var j = 0; j < outputSource.data.length; j++){
              outputSource.data[j] = Math.degToRad( outputSource.data[j] );
            }
          }
          
          // now let's reformat the linear data
          var key = FABRIC.Animation.linearKeyframe;
          var keys = [];
          for (var j = 0; j < inputSource.data.length; j++) {
            keys.push(key(inputSource.data[j], outputSource.data[j]));
          }
          
          // remap the target names
          switch(channelName){
          case 'rotation_x.ANGLE':
          case 'rotateX.ANGLE':
            channelName = 'ori.x';
            break;
          case 'rotation_y.ANGLE':
          case 'rotateY.ANGLE':
            channelName = 'ori.y';
            break;
          case 'rotation_z.ANGLE':
          case 'rotateZ.ANGLE':
            channelName = 'ori.z';
            break;
          case 'translation.X':
          case 'translate.X':
            channelName = 'tr.x';
            break;
          case 'translation.Y':
          case 'translate.Y':
            channelName = 'tr.y';
            break;
          case 'translation.Z':
          case 'translate.Z':
            channelName = 'tr.z';
            break;
          case 'scale.X':
            channelName = 'sc.x';
            break;
          case 'scale.Y':
            channelName = 'sc.y';
            break;
          case 'scale.Z':
            channelName = 'sc.z';
            break;
          }
          
          var trackid = tracks.keys.length;
          tracks.keys.push(keys);
          tracks.name.push(bones[i].name+'.'+channelName);
   
          var target = 'localxfos[' + i + '].' + channelName.split('.')[0];
         
          if (!binding[target]) {
            binding[target] = [-1, -1, -1];
          }
          switch (channelName.split('.')[1]) {
          case 'x':
            binding[target][0] = trackid;
            tracks.color.push(FABRIC.RT.rgb(1, 0, 0));
            break;
           case 'y':
            binding[target][1] = trackid;
            tracks.color.push(FABRIC.RT.rgb(0, 1, 0));
            break;
           case 'z':
            binding[target][2] = trackid;
            tracks.color.push(FABRIC.RT.rgb(0, 0, 1));
            break;
          }
        }
      }
  
      // create the base animation nodes
      var controllerNode = scene.constructNode('AnimationController', {
        name: controllerName+'Controller'
      } );
      var trackNode = scene.constructNode('LinearKeyAnimationTrack', {
        name: controllerName+'AnimationTrack'
      });
      trackNode.setTrackCount(tracks.name.length);
      trackNode.setTracksData(tracks);
  
      // create the evaluator node
      var evaluatorNode = scene.constructNode('AnimationEvaluator', {
        name: controllerName+'Evaluator',
        animationControllerNode: controllerNode,
        animationTrackNode: trackNode
      });
      
      variablesNode.addMember('localxfos', 'Xfo[]', skeletonNode.getReferenceLocalPose());
      evaluatorNode.bindNodeMembersToEvaluatorTracks(variablesNode, binding, rigNode.getName());
      rigNode.addSolver('solveColladaPose', 'FKHierarchySolver', { localxfoMemberName: 'localxfos' });
      
      assetNodes[trackNode.getName()] = trackNode;
      assetNodes[evaluatorNode.getName()] = evaluatorNode;
      assetNodes[controllerNode.getName()] = controllerNode;
    }
    
    // Store the created scene graph nodes in the returned asset map.
    assetNodes[variablesNode.getName()] = variablesNode;
    assetNodes[skeletonNode.getName()] = skeletonNode;
    assetNodes[rigNode.getName()] = rigNode;
    
    var rigData = {
      skeletonNode: skeletonNode,
      rigNode: rigNode
    };
    
    libraryRigs[rootNodeName] = rigData;
    return rigData;
  }

    
  var libraryControllers = {};
  var constructController = function(sceneData, url, name){
    
    // Lazy construction of geometries
    if(libraryControllers[url]){
      return libraryControllers[skinid];
    }
    
    var controllerData = colladaData.libraryControllers[url].skin;
    
    // Get the geometry data that this skin mesh is based on
    var geometryData = colladaData.libraryGeometries[controllerData.source.slice(1)];
    
    var sourceMeshArray = geometryData.mesh.triangles ? geometryData.mesh.triangles : geometryData.mesh.polygons;
    if(!sourceMeshArray){
      throw "No gometry specified";
    }
    if(sourceMeshArray.length !== 1){
      alert("This collada importer only supports one triangle mesh per instance.");
      throw "This collada importer only supports one triangle mesh per instance."
    }
    var meshData = sourceMeshArray[0];
    
    var processedData = processGeometryData(geometryData.mesh, meshData);
    
    ////////////////////////////////////////////////////////////////////////////
    // Construct the Rig
    var jointDataSource = controllerData.sources[controllerData.vertex_weights.inputs.JOINT.source.slice(1)];
    
    // Look up through the hierarchy and find the actual root.
    var joint =  sceneData.nodeLibrary[jointDataSource.data[0]];
    while(joint.parentId && joint.parentId != "Scene_Root"){
      joint = sceneData.nodeLibrary[joint.parentId];
    }
    var skeletonData = constructRigFromHierarchy(sceneData, joint.name, name);
    
    ////////////////////////////////////////////////////////////////////////////
    // Set up the vertex weights.
    // In fabric we store the bind skinning wieghts and indices in 2 vec4 values
    // per vertex, and this is primarily so we can use the GPU for enveloping.
    // Here must convert the source data, which can have any number of bone influences
    // per vertex, down to 4. 
    var vertexWeightsSource = controllerData.sources[controllerData.vertex_weights.inputs.WEIGHT.source.slice(1)];
    var bones = skeletonData.skeletonNode.getBones();
    var boneIds = [];
    var boneWeights = [];
    
    var  bubbleSortWeights = function(weights, indices, start, end) {
      if (start != end - 1) {
        for (var i = start; i < end; i++) {
          for (var j = i + 1; j < end; j++) {
            if (weights[i] < weights[j]) {
              // swap them!
              var tmpScalar = weights[i];
              var tmpIndex = indices[i];
              weights[i] = weights[j];
              indices[i] = indices[j];
              weights[j] = tmpScalar;
              indices[j] = tmpIndex;
            }
          }
        }
      }
    }

    // the vcount table tells us how many bindings deform this vertex.
    // the vertices array is a pair of indices for each joint binding.
    // The first is the JOINT, and then 2nd the WEIGHT
    var makevec4 = function(data) {
      // The following is a bit of a hack. Not sure if we can combine new and apply.
      if (data.length === 0) return new FABRIC.RT.Vec4();
      if (data.length === 1) return new FABRIC.RT.Vec4(data[0], 0, 0, 0);
      if (data.length === 2) return new FABRIC.RT.Vec4(data[0], data[1], 0, 0);
      if (data.length === 3) return new FABRIC.RT.Vec4(data[0], data[1], data[2], 0);
      return new FABRIC.RT.Vec4(data[0], data[1], data[2], data[3]);
    };
    
    var bid = 0;
    for (var i = 0; i < controllerData.vertex_weights.vcounts.length; i++) {
      var boneIdsArray = [];
      var boneWeightsArray = [];
      var numbindings = controllerData.vertex_weights.vcounts[i];
      for (var j = 0; j < numbindings; j++) {
        var jointid = controllerData.vertex_weights.indices[bid];
        var jointweightid = controllerData.vertex_weights.indices[bid+1];
        if(jointid > jointDataSource.data.length){
          throw "ERRROR";
        }
        boneIdsArray[j] = jointid;
        boneWeightsArray[j] = vertexWeightsSource.data[jointweightid];
        bid += 2;
      }
      bubbleSortWeights(boneWeightsArray, boneIdsArray, 0, numbindings);
      boneIds.push(makevec4(boneIdsArray));
      boneWeights.push(makevec4(boneWeightsArray));
    }
    
    // Now remap the generated arrays to the vertices in the mesh we store.
    processedData.geometryData.boneIds = [];
    processedData.geometryData.boneWeights = [];
    var vid = 0;
    for (var i = 0; i < processedData.vertexRemapping.length; i++) {
      var vid = processedData.vertexRemapping[i];
      processedData.geometryData.boneIds.push(boneIds[vid]);
      processedData.geometryData.boneWeights.push(boneWeights[vid]);
    }
    
    processedData.constructionOptions.name = name;
    var characterMeshNode = scene.constructNode('CharacterMesh', processedData.constructionOptions);
    characterMeshNode.loadGeometryData(processedData.geometryData);
    
    
    /////////////////////////////////////
    // set inverse binding matrices
    var jointRemapping = [];
    for (var i = 0; i < jointDataSource.data.length; i++) {
      for (var j = 0; j < bones.length; j++) {
        if(bones[j].name==jointDataSource.data[i]){
          jointRemapping[i] = j;
          break;
        }
      }
      if(j==bones.length){
        warn("Joints '"+jointDataSource.data[i]+"' not found in skeleton");
        jointRemapping[i] = -1;
      }
    }
    
    var bindPoseDataSource = controllerData.sources[controllerData.joints.INV_BIND_MATRIX.source.slice(1)];
    var invmatrices = [];
    for (var j = 0; j < jointDataSource.data.length; j++) {
      var bindPoseValues = getSourceData(bindPoseDataSource, j);
      var mat = FABRIC.RT.mat44.apply(undefined, bindPoseValues).transpose();
      invmatrices[j] = controllerData.bind_shape_matrix.mul(mat);
    }
    characterMeshNode.setInvMatrices(invmatrices, jointRemapping);
    
 
    assetNodes[geometryData.name] = characterMeshNode;
    
    var controllerNodes = {
      characterMeshNode:characterMeshNode,
      skeletonData: skeletonData,
      controllerData: controllerData
    }
    
    libraryControllers[url] = controllerNodes;
    return controllerNodes;
  }
  
  // Construct the Geometries.
  var libraryGeometries = {};
  var getGeometryNode = function(geomid){
    // Lazy construction of geometries
    if(!libraryGeometries[geomid]){
      libraryGeometries[geomid] = constructGeometry(colladaData.libraryGeometries[geomid]);
    }
    return libraryGeometries[geomid];
  }
  
  
  // Construct the Scene
  var constructScene = function(sceneData){
    
    var constructInstance = function(instanceData, parentTransformNode){
      var geometryNode;//, materialNode = defaultMaterial;
      if(instanceData.instance_geometry){
        var url = instanceData.instance_geometry.url.slice(1);
        geometryNode = getGeometryNode(url);
        if(instanceData.instance_geometry.instance_material){
          // TODO:
        }
        
        var transformNodeOptions = { name: instanceData.name +"Transform" };
        if(parentTransformNode){
          transformNodeOptions.hierarchical = true;
          transformNodeOptions.localXfo = instanceData.xfo;
          transformNodeOptions.parentTransformNode = parentTransformNode;
        }else{
          transformNodeOptions.hierarchical = false;
          transformNodeOptions.globalXfo = instanceData.xfo;
        }
        var transformNode = scene.constructNode('Transform', transformNodeOptions );
        if(geometryNode/* && materialNode*/){
          var instanceNode = scene.constructNode('Instance', {
            name: instanceData.name, 
            transformNode: transformNode,
            geometryNode: geometryNode /*,
            materialNode: materialNode */
          });
          assetNodes[instanceData.name] = instanceNode;
        }
      
      }
      else if(instanceData.instance_controller){
        var url = instanceData.instance_controller.url.slice(1);
        var controllerNodes = constructController(sceneData, url, instanceData.name);
        geometryNode = controllerNodes.characterMeshNode;
        /*
        materialNode = scene.constructNode('PhongSkinningMaterial', {
          lightNode: defaultLight,
          diffuseColor: FABRIC.RT.rgba(1.0, 0.0, 0.0, 1.0),
          numBones: controllerNodes.skeletonData.skeletonNode.getNumBones()
        });
        */
        if(instanceData.instance_controller.instance_material){
          // TODO: materialNode =
        }
        /*
        var xfo = new FABRIC.RT.Xfo();
        xfo.setFromMat44(controllerNodes.controllerNodes.bind_shape_matrix);
        var transformNode = scene.constructNode('Transform', {
          hierarchical: false,
          globalXfo: xfo
        });
        */
        var characterNode = scene.constructNode('CharacterInstance', {
            name: instanceData.name+'CharacterInstance',
            geometryNode: controllerNodes.characterMeshNode,
          /*  materialNode: materialNode, 
            transformNode: transformNode, */
            rigNode: controllerNodes.skeletonData.rigNode
          });
        assetNodes[characterNode.getName()] = characterNode;
      }
      
      for(var i=0; i<instanceData.children.length; i++){
        if(instanceData.children[i].type != 'JOINT'){
          constructInstance(instanceData.children[i], transformNode);
        }
      }
    }
    for(var i=0; i<sceneData.nodes.length; i++){
      if(sceneData.nodes[i].type != 'JOINT'){
        constructInstance(sceneData.nodes[i]);
      }
    }
    
    
    // The file may contain a hierarchy that can be used to generate a skeleton
    if (options.constructRigFromHierarchy) {
      var skeletonNode = constructRigFromHierarchy(sceneData, options.constructRigFromHierarchy);
    }
  }
  
  if(colladaData.scene){
    constructScene(colladaData.libraryVisualScenes[colladaData.scene.url.slice(1)]);
  }
  

  return assetNodes;
});

