
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//

FABRIC.SceneGraph.registerParser('dae', function(scene, assetFile, options) {

  var assetNodes = {};
  var animationChannels = {};
  var characterRigs = {};

  // prepare the namemap
  var nameMap = {};
  var nodeNames = [];
  var nodeContainers = [];
  var matrices = [];
  var data = {};
  var currentTechnique = false;
  var exportedNodes = {};
  options.bindToGlobalTime = options.bindToGlobalTime == undefined ? true : options.bindToGlobalTime;
  options.createCharacterInstance = options.createCharacterInstance == undefined ? true : options.createCharacterInstance;

  var createSkeletonFromHierarchy = function(skeletonName, rootNodeName, calcReferencePoseFromInverseBindPose) {
    if (!data[rootNodeName]) {
      throw 'Root node not found:' + rootNodeName;
    }
    var skeletonNode = scene.constructNode('CharacterSkeleton', {
        calcInvMatricies: false,
        calcReferencePoseFromInverseBindPose: calcReferencePoseFromInverseBindPose,
        calcReferenceLocalPose: calcReferencePoseFromInverseBindPose
      }),
       root = data[rootNodeName],
      name,
      parent,
      boneIndicesMap = {},
      bones = [];

    // iniate the children lookups
    for (name in data) {
      if (!data[name].parent) {
        continue;
      }
      if (data[name].parent.name) {
        data[name].parent = data[name].parent.name;
      }
      parent = data[data[name].parent];
      if (!parent) {
        continue;
      }
      if (!parent.children) {
        parent.children = [];
      }
      parent.children.push(name);
    }

    // recurse on the children
    // collect all names, transform nodes as well as parentIDs

    // recurse on the hierarchy
    var traverseChildren = function(name) {
      var boneData = data[name],
        boneOptions = { name: name, parent: -1, length: 0 };
      boneIndicesMap[name] = bones.length;
      if (bones.length > 0) {
        boneOptions.parent = boneIndicesMap[boneData.parent];
      }
      if (boneData.matrix) {
        boneOptions.referenceLocalPose = boneData.matrix;
        if (boneOptions.parent !== -1) {
          boneOptions.referencePose = bones[boneOptions.parent].referencePose.project(boneOptions.referenceLocalPose);

          // set the length of the parent bone based on the child bone local offset.
          if (boneOptions.referenceLocalPose.tr.x >
              (Math.abs(boneOptions.referenceLocalPose.tr.y) + Math.abs(boneOptions.referenceLocalPose.tr.z)) &&
            boneOptions.referenceLocalPose.tr.x > bones[boneOptions.parent].length) {
            bones[boneOptions.parent].length = boneOptions.referenceLocalPose.tr.x;
          }
        }
        else {
          boneOptions.referencePose = boneOptions.referenceLocalPose;
        }
      }
      bones.push(boneOptions);
      if (boneData.children) {
        for (var i = 0; i < boneData.children.length; i++) {
          traverseChildren(boneData.children[i]);
        }
      }
    };
    traverseChildren(rootNodeName);
    // If any bones didn't get a size, then give them the length of the parent bone * 0.5
    for (i = 0; i < bones.length; i++) {
      if (bones[i].length === 0 && bones[i].parent != -1) {
        bones[i].length = bones[bones[i].parent].length * 0.5;
      }
      bones[i].radius = bones[i].length * 0.1;
    }
    skeletonNode.setBones(bones);

    assetNodes[skeletonName + 'CharacterSkeleton'] = skeletonNode;
    return skeletonNode;
  }

  var constructCharacterAnimationNodes = function(skeletonName, data, skeletonNode) {

    //////////////////////////////////////////////////////////////
    // Now we see if any animation is associated with the hierarchy
    // If so, we can also create the character animation pieces.

    // let's get all of the bone names
    var boneNames = skeletonNode.getBoneNames();
    var boneNameToIndex = {};
    for (var i = 0; i < boneNames.length; i++) {
      boneNameToIndex[boneNames[i]] = i;
    }

    // fill in all of the tracks...
    var tracks = [];
    for (var i = 0; i < boneNames.length; i++) {
      var boneName = boneNames[i];
      if (!data[boneName])
        continue;
      var channels = data[boneName].animationChannels;
      if (!channels)
        continue;
      for (var channelName in channels) {
        tracks.push({
          'boneName': boneName,
          'boneIndex': boneNameToIndex[boneName],
          'channelName': channelName,
          'data': channels[channelName]
        });
      }
    }

    // loop all tracks, store the fcurve data and create the binding!
    var binding = {};
    var hasBinding = false;
    var jsonData = {
      name: [],
      color: [],
      keys: []
    };
    for (var i = 0; i < tracks.length; i++) {
      //trackNode.setTrackData(i,tracks[i].data.keys);
      jsonData.keys.push(tracks[i].data.keys);
      jsonData.name.push(tracks[i].boneName + '.' + tracks[i].channelName);

      var tokens = tracks[i].channelName.split('.');
      var target = 'localxfos[' + tracks[i].boneIndex + '].' + tokens[0];
      if (!binding[target]) {
        binding[target] = [-1, -1, -1];
      }
      switch (tokens[1]) {
      case 'x':
        binding[target][0] = i;
        jsonData.color.push(FABRIC.RT.rgb(1, 0, 0));
        break;
       case 'y':
        binding[target][1] = i;
        jsonData.color.push(FABRIC.RT.rgb(0, 1, 0));
        break;
       case 'z':
        binding[target][2] = i;
        jsonData.color.push(FABRIC.RT.rgb(0, 0, 1));
        break;
      }

      hasBinding = true;
    }
    if (hasBinding) {
      var variablesNode = scene.constructNode('CharacterVariables');
      variablesNode.addMember('localxfos', 'Xfo[]', skeletonNode.getReferenceLocalPose());

      // create the base animation nodes
      var controllerNode = scene.constructNode('AnimationController', { bindToGlobalTime: options.bindToGlobalTime } );
      var trackNode = scene.constructNode('LinearKeyAnimationTrack');
      trackNode.setTrackCount(tracks.length);
      trackNode.setTracksData(jsonData);

      // create the evaluator node
      var evaluatorNode = scene.constructNode('AnimationEvaluator', {
          animationControllerNode: controllerNode,
          animationTrackNode: trackNode
        });
      evaluatorNode.bindNodeMembersToEvaluatorTracks(variablesNode, binding);

      // Store the created scene graph nodes in the returned asset map.
      assetNodes[skeletonName + 'CharacterVariables'] = variablesNode;
      assetNodes[skeletonName + 'AnimationEvaluator'] = evaluatorNode;
      assetNodes[skeletonName + 'AnimationController'] = controllerNode;
      assetNodes[skeletonName + 'LinearKeyAnimationTrack'] = trackNode;
    }

  }

  // This is a map of callback functions that are invoked
  // for evey asset found in the file.
  var callbacks = {
    node: function(assetData) {
    },
    camera: function(assetData) {


      var camera = scene.constructNode('Camera');

      if (assetData.data.parent) {
        camera.parent = assetData.data.parent.id;
      }
      camera.matrix = assetData.data.matrix;
      camera.position = camera.matrix.tr;
      camera.target = camera.matrix.ori.rotateVector(FABRIC.RT.vec3(0, 0, -30)).add(camera.matrix.tr);
      camera.roll = 0;

      // let's find the perspective technique
      var persp = false;
      for (var technique in assetData.data.primitive.techniques) {
        if (assetData.data.primitive.techniques[technique].perspective) {
          persp = assetData.data.primitive.techniques[technique].perspective;
          break;
        }
      }
      if (persp) {
        camera.nearDistance = parseFloat(persp.znear);
        camera.farDistance = parseFloat(persp.zfar);

        // compute the fovy given aspect and x fov
        var aspect = parseFloat(persp.aspect_ratio);
        var fovx = parseFloat(persp.xfov);
        fovx *= 3.1416 / 180.0;
        var fovy = Math.tan(Math.atan(0.5 * fovx) * aspect) * 2.0;
        camera.fovY = Math.radToDeg(fovy);
      }
      else {
        camera.nearDistance = 5;
        camera.farDistance = 100;
        camera.fovY = 60.0;
      }

      assetNodes[assetData.id] = camera;

    },
    points: function(assetData) {
      var points = scene.constructNode('Points');
      points.loadDataBlob(assetData.data, 'object');
      assetNodes[assetData.id] = points;
    },
    mesh: function(assetData) {
      if ((!assetData.data.triangles && !assetData.data.polygons) || !assetData.data.vertices) {
        throw (':unsupported mesh definition');
      }

      var data = {};
      data.positions = assetData.data.vertices.positions;
      if (assetData.data.polygons) {
        data.indices = assetData.data.polygons.indices;
        data.normals = assetData.data.polygons.normals;
      }else {
        data.indices = assetData.data.triangles.indices;
        data.normals = assetData.data.triangles.normals;
      }
      // let's check if we have UVs
      var uvs = assetData.data.triangles ?
                assetData.data.triangles.uvCoords :
                (assetData.data.polygons ? assetData.data.polygons.uvCoords : undefined);
      if (uvs) {
        data.uvs0 = uvs;
      }
      // check if we have to split the position array
      if (data.positions.length != data.normals.length) {
        var newPos = [];
        var newIndices = [];
        for (var i = 0; i < data.indices.length; i++) {
          newIndices.push(newIndices.length);
          newPos.push(data.positions[data.indices[i]]);
        }
        data.positions = newPos;
        data.indices = newIndices;
      }

      var trianglesOptions = {};

      // let's check if we have UVs
      if (uvs) {
        trianglesOptions.uvSets = 1;
        trianglesOptions.tangentsFromUV = 0;
      }

      var geometryNode;
      if (assetData.data.controller) {
        geometryNode = scene.constructNode('CharacterMesh', trianglesOptions);
      }else {
        geometryNode = scene.constructNode('Triangles', trianglesOptions);
      }
      assetNodes[assetData.id] = geometryNode;

      geometryNode.loadGeometryData(data);

    //  geometryNode.matrix = assetData.data.matrix;
    //  geometryNode.material = assetData.data.triangles.material;


      // check if we have a controller...
      if (assetData.data.controller) {
        // check if we have an envelope
        if (assetData.data.controller.skin) {
          // allright, we to run
          var skin = assetData.data.controller.skin;

          // make a structure to store all joints
          var colladaData = skin.dataPtr;

          // while we are at it, find the highest
          // deformer in the hierarchy
          var rootJointName = skin.joints.names[0];
          while (colladaData[rootJointName].parent) {
            var parentName = colladaData[rootJointName].parent;
            if (parentName.name)
              parentName = parentName.name;
            if (parentName == 'Scene_Root')
              break;
            if (!colladaData[parentName])
              break;
            rootJointName = parentName;
          }

          // first, let's create the character for deformation
          // so we need to get all of the nodes from the file
          var rigNode = false;
          var skeletonNode = false;
          var skelNames = false;
          var skelNameToID = false;
          var defID = false;
          if (characterRigs[rootJointName]) {
            rigNode = characterRigs[rootJointName].rigNode;
            skelNames = characterRigs[rootJointName].skelNames;
            skelNameToID = characterRigs[rootJointName].skelNameToID;
            defID = characterRigs[rootJointName].defID;
            skeletonNode = rigNode.getSkeletonNode();
          }
          else {
            var skeletonNode = createSkeletonFromHierarchy(assetData.id, rootJointName);//,true);

            // ensure to store the animation on the skeleton!
            var skelNames = skeletonNode.getBoneNames();
            for (var i = 0; i < skelNames.length; i++) {
              if (animationChannels[skelNames[i]] && colladaData[skelNames[i]])
                colladaData[skelNames[i]].animationChannels = animationChannels[skelNames[i]];
            }

            var skelNameToID = {};
            for (var i = 0; i < skelNames.length; i++) {
              skelNameToID[skelNames[i]] = i;
            }
            var defID = [];
            for (var i = 0; i < skin.joints.names.length; i++) {
              if (skelNameToID[skin.joints.names[i]] == undefined) {
                throw (skin.joints.names[i] + ' is not a joint in the skeleton. Corrupt structure.');
              }
              defID.push(skelNameToID[skin.joints.names[i]]);
            }

            // set inverse binding matrices
            var invmatrices = [];
            for (var i = 0; i < skelNames.length; i++) {
              invmatrices.push(FABRIC.RT.mat44());
            }
            for (var i = 0; i < skin.joints.names.length; i++) {
              invmatrices[defID[i]] = skin.joints.inv_matrices[i];
            }
            skeletonNode.setInvMatrices(invmatrices);

            constructCharacterAnimationNodes(assetData.id, colladaData, skeletonNode);

            // create an empty Variables node if we don't have one yet
            var createFKHierarchySolver = false;
            var variablesNode = assetNodes[assetData.id + 'CharacterVariables'];
            if (!variablesNode) {
              variablesNode = scene.constructNode('CharacterVariables');
            }
            else {
              // we have one, so we have animation
              // let's create a solver for the rig
              createFKHierarchySolver = true;
            }

            rigNode = scene.constructNode('CharacterRig', {
                skeletonNode: skeletonNode,
                variablesNode: variablesNode
              });

            // eval the rig if necessary
            if (createFKHierarchySolver) {
              rigNode.addSolver('solveColladaPose', 'FKHierarchySolver', { localxfoMemberName: 'localxfos' });
            }

            characterRigs[rootJointName] = {};
            characterRigs[rootJointName].rigNode = rigNode;
            characterRigs[rootJointName].skelNames = skelNames;
            characterRigs[rootJointName].skelNameToID = skelNameToID;
            characterRigs[rootJointName].defID = defID;

            // Store the created CharacterInstance in the returned assets map.
            assetNodes[assetData.id + 'CharacterRig'] = rigNode;
          }

          // do a remapping of all deformer IDs
          for (var i = 0; i < skin.weights.ids.length; i++) {
            for (var j = 0; j < skin.weights.ids[i].length; j++) {
              skin.weights.ids[i][j] = defID[skin.weights.ids[i][j]];
            }
          }

          // create a character instance!
          if(options.createCharacterInstance) {
            var characterNode = scene.constructNode('CharacterInstance', {
                geometryNode: geometryNode,
                rigNode: rigNode
              });
            assetNodes[assetData.id + 'Instance'] = characterNode;
          }

          // eventually we need to flatten the data as well
          var skinningData = {};
          skinningData.boneIdsArray = skin.weights.ids;
          skinningData.boneWeightsArray = skin.weights.blends;
          if (skinningData.boneIdsArray.length != data.positions.length) {
            skinningData.boneIdsArray = [];
            skinningData.boneWeightsArray = [];
            var indices = assetData.data.triangles.indices;

            for (var i = 0; i < indices.length; i++) {
              if (indices[i] >= skin.weights.ids.length ||
                 indices[i] >= skin.weights.blends.length) {
                throw ('Index indices[' + i + '] is out of bounds.');
              }
              skinningData.boneIdsArray.push(skin.weights.ids[indices[i]]);
              skinningData.boneWeightsArray.push(skin.weights.blends[indices[i]]);
            }
          }

          // flatten that data
          var finalData = {};
          finalData.boneCountArray = [];
          finalData.boneIdsArray = [];
          finalData.boneWeightsArray = [];

          for (var i = 0; i < skinningData.boneIdsArray.length; i++) {
            finalData.boneCountArray.push(skinningData.boneIdsArray[i].length);
            for (var j = 0; j < finalData.boneCountArray[i]; j++) {
              finalData.boneIdsArray.push(skinningData.boneIdsArray[i][j]);
              finalData.boneWeightsArray.push(skinningData.boneWeightsArray[i][j]);
            }
          }

          // convert to skinningData and set it
          geometryNode.loadGeometryData(finalData);
        }
      }

      //  if(animationChannels[ assetData.id ])
      //    assetNodes[ assetData.id ].animationChannels = animationChannels[ assetData.id ];
    },
    animation: function(assetData) {

      // let's loop all of the channels in this animation
      var localData = assetData.data;
      for (var channel in localData.channels) {
        // get the sampler
        var sampler = localData[localData.channels[channel]];
        if (!sampler) continue;

        // now get the different semantics
        // from the sampler, ensure to have the necessary ones
        var semantics = {};
        for (var i = 0; i < sampler.semantics.length; i++)
          semantics[sampler.semantics[i].name] = sampler.semantics[i].source;
        if (!semantics.INPUT || !semantics.OUTPUT || !semantics.INTERPOLATION)
          continue;

        // allright - now we need to create the data
        // let's check the first element of the INTERPOLATION semantic
        var input = localData[semantics.INPUT];
        var output = localData[semantics.OUTPUT];
        var interpolation = localData[semantics.INTERPOLATION];

        // deal with the different cases of animation
        if (interpolation.name_array[0] == 'LINEAR') {
          // ensure we have enough data
          if (input.count != output.count)
            continue;

          // ensure to convert ANGLE to RADIANS
          if (channel.substr(channel.lastIndexOf('.') + 1, 1000) == 'ANGLE') {
            for (var i = 0; i < output.float_array.length; i++)
              output.float_array[i] /= 57.3;
          }

          // now let's reformat the linear data
          var key = FABRIC.Animation.linearKeyframe;
          var keys = [];
          for (var i = 0; i < input.count; i++) {
            keys.push(key(input.float_array[i], output.float_array[i]));
          }
          var id = channel.split('/')[0];
          var target = channel.split('/')[1];

          // remap the target names
          if (target == 'rotation_x.ANGLE')
            target = 'ori.x';
          else if (target == 'rotation_y.ANGLE')
            target = 'ori.y';
          else if (target == 'rotation_z.ANGLE')
            target = 'ori.z';
          else if (target == 'translation.X')
            target = 'tr.x';
          else if (target == 'translation.Y')
            target = 'tr.y';
          else if (target == 'translation.Z')
            target = 'tr.z';
          else if (target == 'scale.X')
            target = 'sc.x';
          else if (target == 'scale.Y')
            target = 'sc.y';
          else if (target == 'scale.Z')
            target = 'sc.z';

          if (!animationChannels[id])
          {
            // todo: assign the animation channels
            // to the right node, they should be stored
            // there directly, never in animationChannels...
            animationChannels[id] = {};
            if (!data[id])
              data[id] = {};
            data[id].animationChannels = animationChannels[id];
          }
          var track = {};
          track.interpolation = interpolation.name_array[0];
          track.keys = keys;
          animationChannels[id][target] = track;
        }
      }
    },
    image: function(assetData) {
      assetNodes[assetData.id] = scene.constructNode('Image', { url: assetData.data.path });
    }
  };

  var xmlText = FABRIC.loadResourceURL(assetFile, 'text/xml');
  var parser = new DOMParser();
  var xmlDoc = parser.parseFromString(xmlText, 'text/xml');

  // create some helper functions to find elements
  var getChildByNodeName = function(node, nodeName) {
    var len = searchNode.childNodes.length;
    for (var i = 0; node < len; i++) {
      if (node.childNodes[i].nodeName == nodeName)
        return node.childNodes[i];
    }
    return false;
  };
  var getChildByNodeAndAttribute = function(node, nodeName, attrName, attrValue) {
    var len = node.childNodes.length;
    for (var i = 0; i < len; i++) {
      if (node.childNodes[i].nodeName == nodeName &&
        node.childNodes[i].getAttribute(attrName) == attrValue)
        return node.childNodes[i];
    }
    return false;
  };
  var parseXmlNode = function(node, parseOptions) {
    // simply skip text
    var nodeName = node.nodeName;
    if (nodeName == '#text')
      return true;

    // check if we should skip this
    if (parseOptions.nodesToIgnore) {
      if (parseOptions.nodesToIgnore[node.nodeName])
        return true;
    }

    nodeNames.push(nodeName);
    var len = node.childNodes.length;

    // for the very basic nodes, let's simply call on all of the children
    switch (nodeName) {
      case 'extra': {
        // ignore extra settings,
        // we will only take care
        // of the common profile
        break;
      }
      case 'node': {
        // check if the node has an id
        var id = node.getAttribute('id');
        if (!id) {
          throw ("The node doesn't have an id.");
        }

        // get all of the light information
        var name = node.getAttribute('name');
        if (!data[id]) {
          data[id] = {};
        }
        nameMap[name] = data[id];
        data[id].id = id;
        data[id].name = name;
        data[id].type = 'node';

        var nbMatrices = matrices.length;
        // Why do we have an array of 'Xfos' called 'matricies'?
        // A Matrix is a partucular math type, as is an Xfo. Surely
        // the corrent name is 'xfos'??
        matrices.push(FABRIC.RT.xfo());

        // store the parent pointer
        data[id].parent = undefined;
        if (node.parentNode.nodeName == 'node') {
          var parentId = node.parentNode.getAttribute('id');
          if (parentId && data[parentId]) {
            data[id].parent = data[parentId];
          }
        }

        // this is a visual node, walk all nodes below
        nodeContainers.push(data[id]);
        for (var i = 0; i < len; i++) {
          if (!parseXmlNode(node.childNodes[i], parseOptions))
            return false;
        }
        nodeContainers.pop();

        // store the latest matrix as our matrix
        data[id].matrix = matrices[matrices.length - 1];

        // remove all of the matrices that this
        // node added to the stack
        while (matrices.length > nbMatrices)
          matrices.pop();

        // store the math functions to retrieve the
        // global transform
        data[id].getLocalTransform = function() {
          return this.matrix;
        };

        // pull on the callback to let the calling script
        // know about a new asset node, only if we haven't
        // exported this node yet.
        if (callbacks.node && !exportedNodes[id]) {
          callbacks.node({'data': data[id], 'id': id, 'name': name});
          exportedNodes[id] = true;
        }
        break;
      }
      case 'translate': {
        // compute a translated matrix and
        var str = node.textContent.split(' ');
        var vec = FABRIC.RT.vec3(parseFloat(str[0]), parseFloat(str[1]), parseFloat(str[2]));
        var m = matrices[matrices.length - 1].clone();
        m.tr.addInPlace(vec);
        matrices.push(m);
        break;
      }
      case 'rotate': {
        // compute a rotated matrix and
        var str = node.textContent.split(' ');
        var q = FABRIC.RT.Quat.makeFromAxisAndAngle(
                  FABRIC.RT.vec3(
                    parseFloat(str[0]),
                    parseFloat(str[1]),
                    parseFloat(str[2])),
                  parseFloat(str[3]));
        var m = matrices[matrices.length - 1].clone();
        m.ori.mulInPlace(q);
        matrices.push(m);
        break;
      }
      case 'scale': {
        // compute a scaled matrix and
        var str = node.textContent.split(' ');
        var vec = FABRIC.RT.vec3(parseFloat(str[0]), parseFloat(str[1]), parseFloat(str[2]));
        var m = matrices[matrices.length - 1].clone();
        m.sc.mulInPlace(vec);
        matrices.push(m);
        break;
      }
      case 'light': {
        // check if the light has an id
        var id = node.getAttribute('id');
        if (!id) {
          throw ("The light node doesn't have an id.");
        }

        // get all of the light information
        var name = node.getAttribute('name');
        if (!data[id])
          data[id] = {};
        nameMap[name] = data[id];
        data[id].id = id;
        data[id].name = name;
        data[id].type = 'library_light';

        // this is a visual node, walk all nodes below
        nodeContainers.push(data[id]);
        for (var i = 0; i < len; i++) {
          if (!parseXmlNode(node.childNodes[i], parseOptions))
            return false;
        }
        nodeContainers.pop();
        break;
      }
      case 'camera': {
        // check if the light has an id
        var id = node.getAttribute('id');
        if (!id) {
          throw ("The camera node doesn't have an id.");
        }

        // get all of the light information
        var name = node.getAttribute('name');
        if (!data[id])
          data[id] = {};
        nameMap[name] = data[id];
        data[id].id = id;
        data[id].name = name;
        data[id].type = 'library_camera';

        // this is a visual node, walk all nodes below
        nodeContainers.push(data[id]);
        for (var i = 0; i < len; i++) {
          if (!parseXmlNode(node.childNodes[i], parseOptions))
            return false;
        }
        nodeContainers.pop();
        break;
      }
      case 'geometry': {
        // check if the node has an id
        var id = node.getAttribute('id');
        if (!id) {
          throw ("The geometry doesn't have an id.");
        }

        // get all of the light information
        var name = node.getAttribute('name');
        if (!data[id])
          data[id] = {};
        nameMap[name] = data[id];
        data[id].id = id;
        data[id].name = name;
        data[id].type = 'geometry';

        // this is a visual node, walk all nodes below
        nodeContainers.push(data[id]);
        for (var i = 0; i < len; i++) {
          if (!parseXmlNode(node.childNodes[i], parseOptions))
            return false;
        }
        nodeContainers.pop();
        break;
      }
      case 'mesh': {
        if (nodeContainers.length > 0) {
          // great, we have the geometry!
          var container = nodeContainers[nodeContainers.length - 1];
          container.mesh = {};
          nodeContainers.push(container.mesh);
          for (var i = 0; i < len; i++) {
            if (!parseXmlNode(node.childNodes[i], parseOptions))
              return false;
          }
          nodeContainers.pop();
        }
        break;
      }
      case 'vertices': {
        if (nodeContainers.length > 0) {
          // great, we have the geometry!
          var container = nodeContainers[nodeContainers.length - 1];
          container.vertices = {};
          container.vertices.id = node.getAttribute('id');
          container[container.vertices.id] = container.vertices;
          nodeContainers.push(container.vertices);
          for (var i = 0; i < len; i++) {
            if (!parseXmlNode(node.childNodes[i], parseOptions))
              return false;
          }
          nodeContainers.pop();

          // now I should all of the data that I need
          if (!container.vertices.positions) {
            var source = container.vertices.semantics[0].source;
            if (!container[source]) {
              throw ('Source ' + source + ' was not found.');
            }
            source = container[source].float_array;

            container.vertices.positions = [];
            for (var i = 0; i < source.length; i += 3)
              container.vertices.positions.push(FABRIC.RT.vec3(source[i], source[i + 1], source[i + 2]));
          }
        }
        break;
      }
      case 'triangles': {
        if (nodeContainers.length > 0) {
          // great, we have the geometry!
          var container = nodeContainers[nodeContainers.length - 1];
          container.triangles = {};

          // see if we have a material and count.
          var material = node.getAttribute('material');
          if (material) {
            // Probably here we should create the material asset, and keep it in an array.
            // Its not clear who is responsible for creating materials.
            // Currently we create materials ourselves.
            container.triangles.material = material;
          }
          var count = node.getAttribute('count');
          if (count) {
            container.triangles.count = parseInt(count);
          }
          nodeContainers.push(container.triangles);
          for (var i = 0; i < len; i++) {
            if (!parseXmlNode(node.childNodes[i], parseOptions))
              return false;
          }
          nodeContainers.pop();
        }
        break;
      }
      case 'polygons':
        if (nodeContainers.length > 0) {
          // great, we have the geometry!
          var container = nodeContainers[nodeContainers.length - 1];
          container.polygons = {};

          // see if we have a material and count.
          var material = node.getAttribute('material');
          if (material) {
            // Probably here we should create the material asset, and keep it in an array.
            // Its not clear who is responsible for creating materials.
            // Currently we create materials ourselves.
            container.polygons.material = material;
          }
          var count = node.getAttribute('count');
          if (count) {
            container.polygons.count = parseInt(count);
          }
          nodeContainers.push(container.polygons);
          for (var i = 0; i < len; i++) {
            if (!parseXmlNode(node.childNodes[i], parseOptions))
              return false;
          }
          nodeContainers.pop();
        }
        break;
      case 'polyList':
        throw ('TODO: support polyLists exported from XSI.');
        if (nodeContainers.length > 0) {
          // great, we have the geometry!
          var container = nodeContainers[nodeContainers.length - 1];
          container.polygons = {};

          // see if we have a material and count.
          var material = node.getAttribute('material');
          if (material) {
            // Probably here we should create the material asset, and keep it in an array.
            // Its not clear who is responsible for creating materials.
            // Currently we create materials ourselves.
            container.polygons.material = material;
          }
          var count = node.getAttribute('count');
          if (count) {
            container.polygons.count = parseInt(count);
          }
          nodeContainers.push(container.polygons);
          for (var i = 0; i < len; i++) {
            if (!parseXmlNode(node.childNodes[i], parseOptions))
              return false;
          }
          nodeContainers.pop();
        }
        break;
      case 'vertex_weights': {
        if (nodeContainers.length > 0) {
          // great, we have the geometry!
          var container = nodeContainers[nodeContainers.length - 1];
          container.weights = {};
          var count = node.getAttribute('count');
          if (count)
            container.weights.count = parseInt(count);
          nodeContainers.push(container.weights);
          for (var i = 0; i < len; i++) {
            if (!parseXmlNode(node.childNodes[i], parseOptions))
              return false;
          }
          nodeContainers.pop();
        }
        break;
      }
      case 'effect': {
        // TODO
        break;
      }
      case 'image': {
        // check if the node has an id
        var id = node.getAttribute('id');
        if (!id) {
          throw ("The image doesn't have an id.");
        }

        if (!data[id])
          data[id] = {};
        data[id].height = parseInt(node.getAttribute('height'));
        data[id].width = parseInt(node.getAttribute('width'));
        data[id].depth = parseInt(node.getAttribute('depth'));

        // loop for the init_from node
        nodeContainers.push(data[id]);
        for (var i = 0; i < len; i++) {
          if (!parseXmlNode(node.childNodes[i], parseOptions))
            return false;
        }
        nodeContainers.pop();

        // fire the animation creation callback!
        if (callbacks.image && !exportedNodes[id]) {
          callbacks.image({'data': data[id], 'id': id});
          exportedNodes[id] = true;
        }
        break;
      }
      case 'init_from': {
        if (nodeContainers.length > 0) {
          var container = nodeContainers[nodeContainers.length - 1];
          container.path = node.textContent;
        }
        break;
      }
      case 'shader': {
        // TODO
        break;
      }
      case 'animation': {
        // check if the node has an id
        var id = node.getAttribute('id');
        if (!id) {
          throw ("The animation doesn't have an id.");
        }

        if (!data[id])
          data[id] = {};

        // this is a visual node, walk all nodes below
        nodeContainers.push(data[id]);
        for (var i = 0; i < len; i++) {
          if (!parseXmlNode(node.childNodes[i], parseOptions))
            return false;
        }
        nodeContainers.pop();

        // fire the animation creation callback!
        if (callbacks.animation && !exportedNodes[id]) {
          callbacks.animation({'data': data[id], 'id': id});
          exportedNodes[id] = true;
        }
        break;
      }
      case 'sampler': {
        if (nodeContainers.length > 0) {
          var container = nodeContainers[nodeContainers.length - 1];

          // check if the node has an id
          var id = node.getAttribute('id');
          if (!id) {
            throw ("The sampler doesn't have an id.");
          }

          container[id] = {};
          nodeContainers.push(container[id]);
          for (var i = 0; i < len; i++) {
            if (!parseXmlNode(node.childNodes[i], parseOptions))
              return false;
          }
          nodeContainers.pop();
        }
        break;
      }
      case 'channel': {
        if (nodeContainers.length > 0) {
          var container = nodeContainers[nodeContainers.length - 1];
          if (!container.channels)
            container.channels = {};
          container.channels[node.getAttribute('target')] = node.getAttribute('source').substr(1, 10000);
        }
        break;
      }
      case 'source': {
        if (nodeContainers.length > 0) {
          // check if the node has an id
          var id = node.getAttribute('id');
          if (!id) {
            throw ("The source doesn't have an id.");
          }
          var container = nodeContainers[nodeContainers.length - 1];
          container[id] = {};
          nodeContainers.push(container[id]);
          for (var i = 0; i < len; i++) {
            if (!parseXmlNode(node.childNodes[i], parseOptions))
              return false;
          }
          nodeContainers.pop();
        }
        break;
      }
      case 'input': {
        if (nodeContainers.length > 0) {
          var container = nodeContainers[nodeContainers.length - 1];
          if (!container.semantics)
            container.semantics = [];
          var semantic = {};
          semantic.name = node.getAttribute('semantic');
          semantic.source = node.getAttribute('source').substr(1, 10000);
          var offset = node.getAttribute('offset');
          if (offset)
            semantic.offset = parseInt(offset);
          else
            semantic.offset = 0;
          container.semantics.push(semantic);
        }
        break;
      }
      case 'param': {
        if (nodeContainers.length > 0) {
            var container = nodeContainers[nodeContainers.length - 1];
            container[node.getAttribute('name')] = node.getAttribute('type');
        }
        break;
      }
      case 'float_array': {
        if (nodeContainers.length > 0) {
          var container = nodeContainers[nodeContainers.length - 1];
          var count = node.getAttribute('count');
          if (count)
            container.count = parseInt(count);

          // Helge: a single regex could probably do this replace faster.
          var str = node.textContent.replace('\r', '').replace('\t', '').replace('  ', ' ').split('\n');
          for (var line in str)
            str[line] = str[line].replace(/^\s+|\s+$/g, '');
          str = str.join(' ').split(' ');
          var float_array = [];
          for (var i in str) {
            if (str[i] == '')
              continue;
            float_array.push(parseFloat(str[i]));
          }
          // now, let's get the text element
          container.float_array = float_array;

          // sanity check
          if (container.count) {
            if (container.count != container.float_array.length) {
              throw ('The float_array in source ' + container.id + ' is corrupt.');
            }
          }
        }
        break;
      }
      case 'vcount': {
        if (nodeContainers.length > 0)
        {
          var container = nodeContainers[nodeContainers.length - 1];

          var str = node.textContent.replace('\r', '').replace('\t', '').replace('  ', ' ').split('\n');
          for (var line in str)
            str[line] = str[line].replace(/^\s+|\s+$/g, '');
          str = str.join(' ').split(' ');
          var vcount = [];
          for (var i in str) {
            if (str[i] == '')
              continue;
            vcount.push(parseInt(str[i]));
          }
          // now, let's get the text element
          container.vcount = vcount;

          // sanity check
          if (container.count) {
            if (container.count != container.vcount.length) {
              throw ('The vcount is corrupt.');
            }
          }
        }
        break;
      }
      case 'Name_array':
      case 'IDREF_array': {
        if (nodeContainers.length > 0)
        {
          var container = nodeContainers[nodeContainers.length - 1];
          var count = node.getAttribute('count');
          if (count)
            container.count = parseInt(count);

          var str = node.textContent.replace('\r', '').replace('\t', '').replace('  ', ' ').split('\n');
          for (var line in str)
            str[line] = str[line].replace(/^\s+|\s+$/g, '');
          str = str.join(' ').split(' ');
          var name_array = [];
          for (var i in str) {
            if (str[i] == '')
              continue;
            name_array.push(str[i]);
          }
          // now, let's get the text element
          container.name_array = name_array;

          // sanity check
          if (container.count) {
            if (container.count != container.name_array.length) {
              throw ('The Name_array in source ' + container.id + ' is corrupt.');
            }
          }
        }
        break;
      }
      case 'p': {
        if (nodeContainers.length > 1)
        {
            var parentContainer = nodeContainers[nodeContainers.length - 2];
            var container = nodeContainers[nodeContainers.length - 1];
            if (!container.semantics) {
              throw ('Collada file is corrupted, no semantics prior to <p>.');
            }

            // check the semantics
            var storage = [];
            var offsets = [];
            var types = [];
            var sources = [];
            var len = container.semantics.length;
            for (var i = 0; i < len; i++) {
              var semantic = container.semantics[i];
              switch (semantic.name) {
              case 'VERTEX':
                container.indices = [];
                storage.push(container.indices);
                offsets.push(semantic.offset);
                types.push('int');
                sources.push(undefined);
                break;
              case 'NORMAL':
                container.normals = [];
                storage.push(container.normals);
                offsets.push(semantic.offset);
                types.push('vec3');
                if (parentContainer[semantic.source])
                  sources.push(parentContainer[semantic.source].float_array);
                else if (parentContainer.mesh[semantic.source])
                  sources.push(parentContainer.mesh[semantic.source].float_array);
                else
                  throw ("Semantic '" + semantic.source + "' not found!");
                break;
              case 'TEXCOORD':
                container.uvCoords = [];
                storage.push(container.uvCoords);
                offsets.push(semantic.offset);
                types.push('vec2');
                if (parentContainer[semantic.source])
                  sources.push(parentContainer[semantic.source].float_array);
                else if (parentContainer.mesh[semantic.source])
                  sources.push(parentContainer.mesh[semantic.source].float_array);
                else
                  throw ("Semantic '" + semantic.source + "' not found!");
                break;
              default: throw ('unrecognised Semantic:' + semantic.name);
              }
              semantic.stride = container.semantics.length;
            }

            // let's convert the indices to a flat list
            var indices = [];
            var str = node.textContent.replace('\r', '').replace('\t', '').replace('  ', ' ').split('\n');
            for (var line in str)
              str[line] = str[line].replace(/^\s+|\s+$/g, '');
            str = str.join(' ').split(' ');
            for (var i in str) {
              if (str[i] == '')
                continue;
              indices.push(parseInt(str[i]));
            }

            // now let's convert the indices to data!
            var offset = 0;
            while (offset < indices.length) {
              for (var i = 0; i < storage.length; i++) {
                if (types[i] == 'int') {
                  if (sources[i])
                    storage[i].push(sources[i][indices[offset + offsets[i]]]);
                  else
                    storage[i].push(indices[offset + offsets[i]]);
                }
                else if (types[i] == 'vec3') {
                  var vec3 = FABRIC.RT.vec3();
                  if (sources[i])
                  {
                    var index = (indices[offset + offsets[i]]) * 3;
                    vec3.x = sources[i][index];
                    vec3.y = sources[i][index + 1];
                    vec3.z = sources[i][index + 2];
                  }
                  storage[i].push(vec3);
                }
                else if (types[i] == 'vec2') {
                  var vec2 = FABRIC.RT.vec2();
                  if (sources[i])
                  {
                    var index = (indices[offset + offsets[i]]) * 2;
                    vec2.x = sources[i][index];
                    vec2.y = sources[i][index + 1];
                  }
                  storage[i].push(vec2);
                }
              }
              offset += storage.length;
            }
        }
        break;
      }
      case 'v': {
        if (nodeContainers.length > 1) {
          var parentContainer = nodeContainers[nodeContainers.length - 2];
          var container = nodeContainers[nodeContainers.length - 1];
          if (!container.semantics) {
            throw ('Collada file is corrupted, no semantics prior to <v>.');
          }

          // check the semantics
          var jointNames = parentContainer[container.semantics[0].source].name_array;
          var uniqueWeights = parentContainer[container.semantics[1].source].float_array;

          // let's convert the indices to a flat list
          var indices = [];
          var str = node.textContent.replace('\r', '').replace('\t', '').replace('  ', ' ').split('\n');
          for (var line in str)
            str[line] = str[line].replace(/^\s+|\s+$/g, '');
          str = str.join(' ').split(' ');
          for (var i in str) {
            if (str[i] == '')
              continue;
            indices.push(parseInt(str[i]));
          }

          container.ids = [];
          container.blends = [];

          var offset = 0;
          for (var i = 0; i < container.vcount.length; i++) {
            var ids = [];
            var blends = [];
            for (var j = 0; j < container.vcount[i]; j++) {
              var useWeight = uniqueWeights[indices[offset + 1]] > 0.001;
              if (useWeight) {
                ids.push(indices[offset]);
                offset++;
                blends.push(uniqueWeights[indices[offset]]);
                offset++;
              }
              else {
                offset += 2;
              }
            }
            container.ids.push(ids);
            container.blends.push(blends);
          }
        }
        break;
      }
      case 'instance_camera': {
        // try to find the camera that has been instanced!
        var url = node.getAttribute('url');
        if (url && nodeContainers.length > 0) {
          if (url.substr(0, 1) == '#')
            url = url.substr(1, 10000);
          if (data[url]) {
            // great, we have the camera!
            var container = nodeContainers[nodeContainers.length - 1];
            container.type = 'camera';
            container.primitive = data[url];
            var id = container.id;
            var name = container.name;
            if (!container.matrix)
              container.matrix = matrices[matrices.length - 1];

            // fire the camera creation callback!
            if (callbacks.camera && !exportedNodes[id]) {
              callbacks.camera({'data': data[id], 'id': id, 'name': name});
              exportedNodes[id] = true;
            }
          }
        }
        break;
      }
      case 'instance_light': {
        // TODO
        // we need to pull on the callback to create a light
        break;
      }
      case 'instance_geometry': {
        // try to find the camera that has been instanced!
        var url = node.getAttribute('url');
        if (url && nodeContainers.length > 0) {
          if (url.substr(0, 1) == '#')
            url = url.substr(1, 10000);
          if (data[url]) {
            // great, we have the geometry!
            var container = nodeContainers[nodeContainers.length - 1];
            container.type = 'camera';
            container.primitive = data[url];
            var id = container.id;
            var name = container.name;
            if (!container.matrix)
              container.matrix = matrices[matrices.length - 1];

            // loop over all geometries inside and fire them
            for (var geoType in container.primitive) {
              if (callbacks[geoType] && !exportedNodes[id]) {
                container.primitive[geoType].matrix = container.matrix;
                callbacks.mesh({'data': container.primitive[geoType], 'id': id, 'name': name, 'type': geoType});
                exportedNodes[id] = true;
              }
            }
          }
        }
        break;
      }
      case 'instance_controller': {
        // try to find the camera that has been instanced!
        var url = node.getAttribute('url');
        if (url && nodeContainers.length > 0) {
          if (url.substr(0, 1) == '#')
            url = url.substr(1, 10000);
          if (data[url]) {
            // great, we have the geometry!
            var container = nodeContainers[nodeContainers.length - 1];
            container.type = 'mesh';

            var controller = data[url];
            var geo = data[controller.skin.source];

            container.primitive = geo.mesh;
            if (!container.primitive)
              return false;

            container.primitive.controller = controller;

            // check if there is skin
            if (controller.skin) {
              // now look all of the names and find the data
              controller.skin.dataPtr = data;
            }

            var id = container.id;
            var name = container.name;
            if (!container.matrix)
              container.matrix = matrices[matrices.length - 1];

            if (callbacks['mesh'] && !exportedNodes[id]) {
              container.primitive.matrix = container.matrix;
              callbacks.mesh({'data': container.primitive, 'id': id, 'name': name, 'type': 'mesh'});
              exportedNodes[id] = true;
            }
          }
        }
      }
      case 'accessor': {
        if (nodeContainers.length > 0) {
          var container = nodeContainers[nodeContainers.length - 1];
          container.accessor = {};

          var count = node.getAttribute('count');
          if (!count)count = '1';
          container.accessor.count = parseInt(count);
          var stride = node.getAttribute('stride');
          if (!stride)stride = '1';
          container.accessor.stride = parseInt(stride);

          // loop over all child nodes
          nodeContainers.push(container.accessor);
          for (var i = 0; i < len; i++) {
            if (!parseXmlNode(node.childNodes[i], parseOptions))
              return false;
          }
          nodeContainers.pop();
        }
        break;
      }
      case 'controller': {
        // check if the node has an id
        var id = node.getAttribute('id');
        if (!id) {
          throw ("The controller doesn't have an id.");
        }
        if (!data[id])
          data[id] = {};

        // loop over all child nodes
        nodeContainers.push(data[id]);
        for (var i = 0; i < len; i++) {
          if (!parseXmlNode(node.childNodes[i], parseOptions))
            return false;
        }
        nodeContainers.pop();
        break;
      }
      case 'skin': {
        if (nodeContainers.length > 0) {
          var container = nodeContainers[nodeContainers.length - 1];

          // check if the node has an source
          var source = node.getAttribute('source');
          if (!source) {
            throw ("The controller doesn't have an source.");
          }
          source = source.substr(1, 10000);

          container.skin = {};
          container.skin.source = source;

          // loop over all child nodes
          nodeContainers.push(container.skin);
          for (var i = 0; i < len; i++) {
            if (!parseXmlNode(node.childNodes[i], parseOptions))
              return false;
          }
          nodeContainers.pop();
        }
        break;
      }
      case 'bind_shape_matrix': {
        if (nodeContainers.length > 0) {
          var container = nodeContainers[nodeContainers.length - 1];

          var str = node.textContent.replace('\r', '').replace('\t', '').replace('  ', ' ').split('\n');
          for (var line in str)
            str[line] = str[line].replace(/^\s+|\s+$/g, '');
          str = str.join(' ').split(' ');
          if (str[0] == '')
            str.splice(0, 1);

          var matrix44 = FABRIC.RT.mat44();
          matrix44.row0.x = parseFloat(str[0]);
          matrix44.row0.y = parseFloat(str[1]);
          matrix44.row0.z = parseFloat(str[2]);
          matrix44.row0.t = parseFloat(str[3]);
          matrix44.row1.x = parseFloat(str[4]);
          matrix44.row1.y = parseFloat(str[5]);
          matrix44.row1.z = parseFloat(str[6]);
          matrix44.row1.t = parseFloat(str[7]);
          matrix44.row2.x = parseFloat(str[8]);
          matrix44.row2.y = parseFloat(str[9]);
          matrix44.row2.z = parseFloat(str[10]);
          matrix44.row2.t = parseFloat(str[11]);
          matrix44.row3.x = parseFloat(str[12]);
          matrix44.row3.y = parseFloat(str[13]);
          matrix44.row3.z = parseFloat(str[14]);
          matrix44.row3.t = parseFloat(str[15]);
          container.bind_matrix = matrix44.transpose();
        }
        break;
      }
      case 'joints': {
        if (nodeContainers.length > 0) {
          var container = nodeContainers[nodeContainers.length - 1];
          container.joints = {};
          nodeContainers.push(container.joints);
          for (var i = 0; i < len; i++) {
            if (!parseXmlNode(node.childNodes[i], parseOptions))
              return false;
          }
          nodeContainers.pop();

          // loop over the joints and parse the semantics
          for (var i = 0; i < container.joints.semantics.length; i++) {
            var semantic = container.joints.semantics[i];
            if (semantic.name == 'JOINT') {
              container.joints.names = container[semantic.source].name_array;
              container.joints.count = container.joints.names.length;
            }
            else if (semantic.name == 'INV_BIND_MATRIX') {
              // convert the float array to matrices
              container.joints.inv_matrices = [];
              var floats = container[semantic.source].float_array;
              var count = floats.length / 16;
              for (var i = 0; i < count; i++) {
                var matrix44 = FABRIC.RT.mat44();
                matrix44.row0.x = floats[i * 16 + 0];
                matrix44.row1.x = floats[i * 16 + 1];
                matrix44.row2.x = floats[i * 16 + 2];
                matrix44.row3.x = floats[i * 16 + 3];
                matrix44.row0.y = floats[i * 16 + 4];
                matrix44.row1.y = floats[i * 16 + 5];
                matrix44.row2.y = floats[i * 16 + 6];
                matrix44.row3.y = floats[i * 16 + 7];
                matrix44.row0.z = floats[i * 16 + 8];
                matrix44.row1.z = floats[i * 16 + 9];
                matrix44.row2.z = floats[i * 16 + 10];
                matrix44.row3.z = floats[i * 16 + 11];
                matrix44.row0.t = floats[i * 16 + 12];
                matrix44.row1.t = floats[i * 16 + 13];
                matrix44.row2.t = floats[i * 16 + 14];
                matrix44.row3.t = floats[i * 16 + 15];
                container.joints.inv_matrices.push(matrix44);
              }
            }
          }
        }
        break;
      }
      default: {
        if (nodeName.substr(0, 9) == 'technique') {
          if (nodeContainers.length > 0) {
            currentTechnique = {};
            var container = nodeContainers[nodeContainers.length - 1];
            if (!container.techniques)
              container.techniques = {};

            // if we have a nodeContainer, store all techniques!
            if (nodeName == 'technique') {
              container.techniques[node.getAttribute('sid')] = currentTechnique;
            }
            else {
              container.techniques[nodeName.substr(10, 10000)] = currentTechnique;
            }

            // loop over all child nodes
            nodeContainers.push(currentTechnique);
            for (var i = 0; i < len; i++) {
              if (!parseXmlNode(node.childNodes[i], parseOptions))
                return false;
            }
            nodeContainers.pop();

            // disable the technique
            currentTechnique = false;
          }
          break;
        }
        else {
          // this means we are in an unknown node.
          if (currentTechnique) {
            var container = nodeContainers[nodeContainers.length - 1];
            if (node.childElementCount > 0) {
              var d = {};
              container[nodeName] = d;
              nodeContainers.push(d);
              for (var i = 0; i < len; i++)
              {
                if (!parseXmlNode(node.childNodes[i], parseOptions))
                  return false;
              }
              nodeContainers.pop();
            }
            else {
              container[nodeName] = node.textContent;
            }
          }
          else {
            for (var i = 0; i < len; i++)
            {
              if (!parseXmlNode(node.childNodes[i], parseOptions))
                return false;
            }
          }
        }
      }
    }
    nodeNames.pop();

    return true;
  };

  // get the root and check its type
  var xmlRoot = xmlDoc.firstChild;
  if (xmlRoot.nodeName != 'COLLADA') {
    throw 'Collada file is corrupted.';
  }

  // run the recursive parse on the root
  parseXmlNode(xmlRoot, options);

  // The file may contain a hierarchy that can be used to generate a skeleton
  if (options.buildSkeletonFromHierarchy) {

    var skeletonNode = createSkeletonFromHierarchy(options.buildSkeletonFromHierarchy,
                                                   options.buildSkeletonFromHierarchy);

    // I'm not such a fan of this code, as it is quite hard to follow.
    // Here we see if there is animation associated with this hierarchy,
    // and generate the associated nodes.
    constructCharacterAnimationNodes(options.buildSkeletonFromHierarchy, data, skeletonNode);

  }

  return assetNodes;
});

