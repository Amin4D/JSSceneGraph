
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//


FABRIC.SceneGraph.registerNodeType('Texture', {
  briefDesc: 'The Texture node is an Image node which can be used for texturing of a 3D object.',
  detailedDesc: 'The Texture node is an Image node which can be used for texturing of a 3D object.',
  parentNodeDesc: 'SceneGraphNode',
  factoryFn: function(options, scene) {
    var textureNode = scene.constructNode('SceneGraphNode', options);
    return textureNode;
  }});

  // TODO: The texture image type needs to be broken into LDR and HDR.
  // here we have HDR image loading mixed in with LDR image loading,
  // but it should be a separate type.
FABRIC.SceneGraph.registerNodeType('Image', {
  briefDesc: 'The Image node holds image data, and optionally creates an URL image loader and an OpenGL texture.',
  detailedDesc: 'The Image node holds generic image data (members: pixels, width, height), which might be HDR (member: hdr). ' +
                'If \'options.createResourceLoadNode\', an URL-based image loader will be incorporated, and currently supports ' +
                '.png, .tga, .exr and .hdr image formats. If \'options.createLoadTextureEventHandler\', an OpenGL texture ' +
                'will be created from the image.',
  parentNodeDesc: 'Texture',
  optionsDesc: {
    wantHDR: 'Set to true this flags enables the Image node to use float values instead if bytes.',
    wantRGBA: 'Set to true this flag enables the Image node to store the A channel.',
    createDgNode: 'If this is set to true the Image node will contain a dgnode to store the pixel data.',
    createResourceLoadNode: 'Set to true this flag will enable the Image node to load a texture off a resource load node.',
    createLoadTextureEventHandler: 'If the image uses a ResouceLoadNode and this flag is set, it will create an EventHandler for the Image being loaded.',
    width: 'The width of the empty Image',
    height: 'The height of the empty Image',
    color: 'The standard color for the empty Image',
    url: 'The URL to load the Image from',
    forceRefresh: 'If this is set, the Image will always be re-loaded onto the GPU. This is useful for animated Images.'
  },
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
      wantHDR: false,
      wantRGBA: true,
      createDgNode: false,
      createResourceLoadNode: true,
      createLoadTextureEventHandler: true,
      initImage: true,
      width: 128,
      height: 128,
      color: FABRIC.RT.rgba(0.0,0.0,0.0,0.0),
      url: undefined,
      forceRefresh: false
    });
    
    var imageNode = scene.constructNode('Texture', options);
    if(options.createDgNode){
      var dgnode = imageNode.constructDGNode('DGNode')
      dgnode.addMember('hdr', 'Boolean', options.wantHDR);
      dgnode.addMember('width', 'Size', options.createResourceLoadNode ? undefined : options.width);
      dgnode.addMember('height', 'Size', options.createResourceLoadNode ? undefined : options.height);
      dgnode.addMember('pixels', (options.wantHDR ? 'Color' : (options.wantRGBA ? 'RGBA' : 'RGB')) + '[]');
  
      imageNode.addMemberInterface(dgnode, 'width');
      imageNode.addMemberInterface(dgnode, 'height');
    }

    if (options.createResourceLoadNode) {
      var resourceLoadNode = scene.constructNode('ResourceLoad', options);
      var resourceloaddgnode = resourceLoadNode.getDGLoadNode();
      if(options.createDgNode){
        dgnode.setDependency(resourceloaddgnode, 'resource');
        dgnode.bindings.append(scene.constructOperator({
          operatorName: (options.wantHDR ? 'loadImageHDR' : 'loadImageLDR'),
          parameterLayout: [
            'resource.resource',
            'self.width',
            'self.height',
            'self.pixels'
          ],
          entryFunctionName: (options.wantHDR ? 'loadImageHDR' : 'loadImageLDR'),
          srcFile: 'FABRIC_ROOT/SceneGraph/KL/loadTexture.kl'
        }));
      };

      imageNode.pub.getResourceLoadNode = function() {
        return resourceLoadNode.pub;
      };

      imageNode.pub.isImageLoaded = function() {
        return resourceLoadNode ? resourceLoadNode.pub.isLoaded() : false;
      };
    } else {
      if(options.createDgNode && options.initImage && options.width && options.height){
        dgnode.addMember('color', 'RGBA', options.color);
        dgnode.addMember('initiated', 'Boolean', false);
        dgnode.bindings.append(scene.constructOperator({
          operatorName: 'initImageFromColor',
          parameterLayout: [
            'self.width',
            'self.height',
            'self.color',
            'self.pixels',
            'self.initiated'
          ],
          entryFunctionName: 'initImageFromColor',
          srcFile: 'FABRIC_ROOT/SceneGraph/KL/loadTexture.kl'
        }));
      };
    }

    if (options.createLoadTextureEventHandler) {
      // Construct the handler for loading the image into texture memory.
      var redrawEventHandler = imageNode.constructEventHandlerNode('Redraw');
      var oglTexture = FABRIC.RT.oglTexture2D();
      oglTexture.forceRefresh = options.forceRefresh;
      redrawEventHandler.addMember('oglTexture2D', 'OGLTexture2D', oglTexture);
      if(options.createDgNode){
        redrawEventHandler.setScope('image', dgnode);
        redrawEventHandler.preDescendBindings.append(scene.constructOperator({
          operatorName: 'bindTextureLDR',
          srcFile: 'FABRIC_ROOT/SceneGraph/KL/loadTexture.kl',
          entryFunctionName: 'bindTextureLDR',
          parameterLayout: [
            'image.width',
            'image.height',
            'image.pixels',
            'self.oglTexture2D',
            'textureStub.textureUnit'
          ]
        }));
      }
      else if(options.createResourceLoadNode){
        redrawEventHandler.setScope('resource', resourceloaddgnode);
        redrawEventHandler.preDescendBindings.append(scene.constructOperator({
          operatorName: 'loadAndBindTextureLDR',
          srcFile: 'FABRIC_ROOT/SceneGraph/KL/loadTexture.kl',
          entryFunctionName: 'loadAndBindTextureLDR',
          parameterLayout: [
            'resource.resource',
            'self.oglTexture2D',
            'textureStub.textureUnit'
          ]
        }));
      }
    }

    imageNode.pub.getURL = function() {
      return resourceLoadNode ? resourceLoadNode.pub.getUrl() : '';
    };

    return imageNode;
  }});

FABRIC.SceneGraph.registerNodeType('CubeMap', {
  briefDesc: 'The CubeMap node contains 6 Image nodes which can be used to texture with cubic mapping. ',
  detailedDesc: 'The CubeMap node contains 6 Image nodes which can be used to texture with cubic mapping. ' +
                'This means it requires six images to be aligned in a cubic fashion.',
  parentNodeDesc: 'Texture',
  optionsDesc: {
    urls: 'An array of six URLs to the six images to load.',
  },
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
      urls: []
    });
    
    var cubMapNode = scene.constructNode('Texture', options);
    var redrawEventHandler = cubMapNode.constructEventHandlerNode('Redraw');
    redrawEventHandler.addMember('cubeMap', 'OGLTextureCube', FABRIC.RT.cubeMapLDR());
    
    var createTextureLoaderNode = function(url, faceId){
      var resourceLoadNode = scene.constructNode('ResourceLoad', { url: url });
      var resourceloaddgnode = resourceLoadNode.getDGLoadNode();
      redrawEventHandler.setScope('resource'+faceId, resourceloaddgnode);
    }
    createTextureLoaderNode(options.urls[0], 0);
    createTextureLoaderNode(options.urls[1], 1);
    createTextureLoaderNode(options.urls[2], 2);
    createTextureLoaderNode(options.urls[3], 3);
    createTextureLoaderNode(options.urls[4], 4);
    createTextureLoaderNode(options.urls[5], 5);

    redrawEventHandler.preDescendBindings.append(scene.constructOperator({
        operatorName: 'bindCubeMap',
        srcFile: 'FABRIC_ROOT/SceneGraph/KL/loadCubeMap.kl',
        entryFunctionName: 'bindCubeMap',
        parameterLayout: [
          'resource0.resource',
          'resource1.resource',
          'resource2.resource',
          'resource3.resource',
          'resource4.resource',
          'resource5.resource',
          'self.cubeMap',
          'textureStub.textureUnit'
        ]
      }));
    return cubMapNode;
  }});

FABRIC.SceneGraph.registerNodeType('Video', {
  briefDesc: 'The Video node is an Image node that changes over time.',
  detailedDesc: 'The Video node uses the ffmpeg extension to load animated video footage into an Image node. ' +
                'For that the image content is repeatedly copied onto the GPU.',
  parentNodeDesc: 'Image',
  optionsDesc: {
    localFileName: 'The Video node currently only supports a local filename, not an URL.',
  },
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
        localFileName: ''
      });

    // ensure to use the right settings for video
    options.createResourceLoadNode = false;
    options.createLoadTextureEventHandler = false;
    options.createDgNode = true;
    options.initImage = false;
    options.wantHDR = false;
    options.wantRGBA = false;

    // check if we have a filename
    if (!options.localFileName) {
        throw ('You need to specify a valid localFileName for a video node!');
    }

    var videoNode = scene.constructNode('Image', options);
    // add all members
    var dgnode = videoNode.getDGNode();
    dgnode.addMember('filename', 'String', options.localFileName);
    dgnode.addMember('stream', 'Size', 0);
    dgnode.addMember('duration', 'Scalar', 0);
    dgnode.addMember('fps', 'Scalar', 0);
    dgnode.addMember('loop', 'Boolean', true);

    videoNode.addMemberInterface(dgnode, 'filename');
    videoNode.addMemberInterface(dgnode, 'stream');
    videoNode.addMemberInterface(dgnode, 'duration');
    videoNode.addMemberInterface(dgnode, 'fps');
    videoNode.addMemberInterface(dgnode, 'loop');

    // make it dependent on the scene time
    dgnode.setDependency(scene.getGlobalsNode(), 'globals');

    dgnode.bindings.append(scene.constructOperator({
      operatorName: 'videoLoadInfo',
      srcFile: 'FABRIC_ROOT/SceneGraph/KL/loadVideo.kl',
      entryFunctionName: 'videoLoadInfo',
      parameterLayout: [
        'self.filename',
        'self.stream',
        'self.width',
        'self.height',
        'self.duration',
        'self.fps'
      ]
    }));

    dgnode.bindings.append(scene.constructOperator({
      operatorName: 'videoSeekTime',
      srcFile: 'FABRIC_ROOT/SceneGraph/KL/loadVideo.kl',
      entryFunctionName: 'videoSeekTime',
      parameterLayout: [
        'self.stream',
        'globals.time'
      ]
    }));

    dgnode.bindings.append(scene.constructOperator({
      operatorName: 'videoGetPixels',
      srcFile: 'FABRIC_ROOT/SceneGraph/KL/loadVideo.kl',
      entryFunctionName: 'videoGetPixels',
      parameterLayout: [
        'self.stream',
        'self.width',
        'self.height',
        'self.pixels'
      ]
    }));

    var redrawEventHandler = videoNode.constructEventHandlerNode('Redraw');
    redrawEventHandler.setScope('video', dgnode);
    redrawEventHandler.addMember('bufferID', 'Size', 0);
    redrawEventHandler.preDescendBindings.append(scene.constructOperator({
        operatorName: 'videoLoadToGPU',
        srcFile: 'FABRIC_ROOT/SceneGraph/KL/loadVideo.kl',
        entryFunctionName: 'videoLoadToGPU',
        parameterLayout: [
          'video.width',
          'video.height',
          'video.pixels',
          'self.bufferID',
          'textureStub.textureUnit'
        ]
    }));
    
    // extend public interface
    videoNode.pub.forceEvaluate = function(){
      dgnode.evaluate();
    };
    videoNode.pub.getDuration = function(){
      return dgnode.getData("duration");
    };
    videoNode.pub.getFps = function(){
      return dgnode.getData("fps");
    };

    return videoNode;
  }});

FABRIC.SceneGraph.registerNodeType('PointSpriteTexture', {
  briefDesc: 'The PointSpriteTexture is an Image node that can be used to texture a point using a sprite.',
  detailedDesc: 'The PointSpriteTexture is an Image node that can be used to texture a point using a sprite. ' +
                'You can specify the resolution of the sprite.',
  parentNodeDesc: 'Texture',
  optionsDesc: {
    spriteResolution: 'The resolution of the sprite texture.',
  },
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
        spriteResolution: 32
      });
    
    var pointSpriteTextureNode = scene.constructNode('Texture', options);
    
    var dgnode = pointSpriteTextureNode.constructDGNode('DGNode');
    dgnode.addMember('resolution', 'Integer', options.spriteResolution);

    var redrawEventHandler = pointSpriteTextureNode.constructEventHandlerNode('Redraw');
    redrawEventHandler.setScope('image', dgnode);
    redrawEventHandler.addMember('bufferID', 'Size', 0);
    redrawEventHandler.preDescendBindings.append(scene.constructOperator({
            operatorName: 'createSpriteTexture',
            srcFile: 'FABRIC_ROOT/SceneGraph/KL/loadTexture.kl',
            entryFunctionName: 'createSpriteTexture',
            parameterLayout: [
              'image.resolution',
              'self.bufferID',
              'textureStub.textureUnit'
            ]
          }));

    return pointSpriteTextureNode;
  }});


/**
 * Table storing all of the known shader attributes and their types.
 */
FABRIC.SceneGraph.getShaderParamID = ( function(){
  var paramCount = 0;
  var paramMap = {};
  return function(name){
    if(paramMap[name]){
      return paramMap[name];
    }
    else{
      paramCount++;
      paramMap[name] = paramCount;
      return paramCount;
    }
  }
})();


FABRIC.SceneGraph.registerNodeType('Shader', {
  briefDesc: 'The Shader node is used to load a GLSL shader onto the GPU.',
  detailedDesc: 'The Shader node is used to load a GLSL shader onto the GPU. ' +
                'It provides access to the uniforms of the GLSL shader. Shaders node are re-used to ensure ' +
                'maximum performance as well as low memory use.',
  parentNodeDesc: 'SceneGraphNode',
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
        parentEventHandler: scene.getSceneRedrawOpaqueObjectsEventHandler(),
        debug: false,
        unloadShader: true
      });
    var shaderNode = scene.constructNode('SceneGraphNode', options),
      redrawEventHandler = shaderNode.constructEventHandlerNode('Redraw'),
      shaderProgram = new FABRIC.RT.OGLShaderProgram(options.name);
      i;
    
    redrawEventHandler.setScopeName('shader');

    if (options.fragmentShader) {
      shaderProgram.shaderSources.push(new FABRIC.RT.OGLShaderSource(
        options.fragmentShader, FABRIC.SceneGraph.OpenGLConstants.GL_FRAGMENT_SHADER));
    }
    if (options.vertexShader) {
      shaderProgram.shaderSources.push(new FABRIC.RT.OGLShaderSource(
        options.vertexShader, FABRIC.SceneGraph.OpenGLConstants.GL_VERTEX_SHADER));
    }
    if (options.tessControlShader) {
      shaderProgram.shaderSources.push(new FABRIC.RT.OGLShaderSource(
        options.tessControlShader, FABRIC.SceneGraph.OpenGLConstants.GL_TESS_CONTROL_SHADER));
    }
    if (options.tessEvalShader) {
      shaderProgram.shaderSources.push(new FABRIC.RT.OGLShaderSource(
        options.tessEvalShader, FABRIC.SceneGraph.OpenGLConstants.GL_TESS_EVALUATION_SHADER));
    }
    if (options.geometryShader) {
      shaderProgram.shaderSources.push(new FABRIC.RT.OGLShaderSource(
        options.geometryShader, FABRIC.SceneGraph.OpenGLConstants.GL_GEOMETRY_SHADER_EXT));
    }
    
    ///////////////////////////////////////////////////
    // Uniform Values
    for (i in options.shaderUniforms) {
      shaderProgram.uniformValues.push(new FABRIC.RT.OGLShaderValue(
        options.shaderUniforms[i].name, FABRIC.SceneGraph.getShaderParamID(i)));
    }

    ///////////////////////////////////////////////////
    // Attribute Values
    var attributeValues = [];
    for (i in options.shaderAttributes) {
      shaderProgram.attributeValues.push(new FABRIC.RT.OGLShaderValue(
        options.shaderAttributes[i].name, FABRIC.SceneGraph.getShaderParamID(i)));
    }

    ///////////////////////////////////////////////////
    // Enable Options
    if(options.disableOptions){
      shaderProgram.disableOptions = options.disableOptions;
    }
    if(options.enableOptions){
      shaderProgram.enableOptions = options.enableOptions;
    }
    if(options.blendModeSfactor){
      shaderProgram.blendModeSfactor = options.blendModeSfactor;
    }
    if(options.blendModeDfactor){
      shaderProgram.blendModeDfactor = options.blendModeDfactor;
    }
    if(options.cullFace){
      shaderProgram.cullFace = options.cullFace;
    }
    
    ///////////////////////////////////////////////////
    // EXT Params
    for (i in options.programParams) {
       shaderProgram.programParams.push(new FABRIC.RT.OGLShaderProgramParam(
        FABRIC.SceneGraph.OpenGLConstants[i], options.programParams[i]));
    }
    
    ///////////////////////////////////////////////////
    // Draw Params
    if(options.drawParams) {
      if(options.drawParams.drawMode){
        shaderProgram.drawMode = FABRIC.SceneGraph.OpenGLConstants[options.drawParams.drawMode];
      }
      if(options.drawParams.patchVertices){
        shaderProgram.patchVertices = options.drawParams.patchVertices;
      }
    }
    
    shaderProgram.debug = options.debug;
    redrawEventHandler.addMember('shaderProgram', 'OGLShaderProgram', shaderProgram);
  
    var loadShaderOp = scene.constructOperator({
      operatorName: 'loadShader',
      srcFile: 'FABRIC_ROOT/SceneGraph/KL/loadShader.kl',
      entryFunctionName: 'loadShader',
      parameterLayout: [
        'self.shaderProgram'
      ]
    });
    
    if(options.assignUniformsOnPostDescend == true){
      // Post Processing operators invoke the shader on the post
      // decent pass. After the geometry in the sub tree is drawn.
      redrawEventHandler.postDescendBindings.append(loadShaderOp);
    }else{
      redrawEventHandler.preDescendBindings.append(loadShaderOp);
    }
    
    // Note: This optimization causes the lamborgini scene to crash
    // after a few seconds. The OpenGL stack is probably overflowing.
    // Ideally we don't need this when we aren't changing options.
  /*  if((options.disableOptions &&
        options.disableOptions.length > 0) ||
       (options.enableOptions &&
        options.enableOptions.length > 0)){
  */  redrawEventHandler.postDescendBindings.append(scene.constructOperator({
        operatorName: 'unloadShader',
        srcFile: 'FABRIC_ROOT/SceneGraph/KL/loadShader.kl',
        entryFunctionName: 'unloadShader',
        parameterLayout: [
          'self.shaderProgram'
        ]
      }));
// }
    
    if (options.parentEventHandler !== false) {
      // The shader is registered with the scenegraph, which will
      // handle passing render events to the shader from the cameras.
      options.parentEventHandler.appendChildEventHandler(redrawEventHandler);
    }
    
    shaderNode.getVBORequirements = function() {
      return options.shaderAttributes;
    };
    return shaderNode;
  }}
);



FABRIC.SceneGraph.registerNodeType('Material', {
  briefDesc: 'The Material node is the base node for all Materials.',
  detailedDesc: 'The Material node is the base node for all Materials. It should not be used directly, ' +
                'rather through other Material presets such as \'FlatMaterial\' for example.',
  parentNodeDesc: 'SceneGraphNode',
  optionsDesc: {
    separateShaderNode: 'If set to true, this will allow to create a separate shader node for optimizing performance.',
    shaderNode: 'If specified, use the given shaderNode instead of creating a new one.',
    storeUniformsInDGNode: 'If set to true, the uniforms of the shader will be stored in a separate uniforms dgnode.',
    assignUniformsOnPostDescend: 'If set to true the uniforms will be assigned on the post descend of the event handler.'
  },
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
        separateShaderNode: true,
        shaderNode: undefined,
        storeUniformsInDGNode: false,
        assignUniformsOnPostDescend: false
      });

    var materialNode,
      dgnode,
      redrawEventHandler,
      materialType = options.type,
      shader,
      i;

    if(options.drawOverlayed){
      options.disableOptions = (options.disableOptions ? options.disableOptions : []);
      if(options.disableOptions.indexOf(FABRIC.SceneGraph.OpenGLConstants.GL_DEPTH_TEST) == -1){
        options.disableOptions.push(FABRIC.SceneGraph.OpenGLConstants.GL_DEPTH_TEST);
      }
      // TODO: add an 'overlay' subtree to the render graph. This tree should render after transparency
      options.parentEventHandler = scene.getSceneRedrawOverlayObjectsEventHandler();
      options.shaderNameDecoration = (options.shaderNameDecoration ? options.shaderNameDecoration : "") + "Overlay";
    }
        
    if (options.separateShaderNode) {
      if(options.shaderNode){
        shader = options.shaderNode;
      }
      else{
      
        var shaderName = materialType + 'Shader' + (options.shaderNameDecoration !== undefined ?
                                                options.shaderNameDecoration : '');
  
        shader = scene.constructShaderNode(shaderName, {
          name: shaderName,
          fragmentShader: options.fragmentShader,
          vertexShader: options.vertexShader,
          tessControlShader: options.tessControlShader,
          tessEvalShader: options.tessEvalShader,
          geometryShader: options.geometryShader,
          shaderUniforms: options.shaderUniforms,
          shaderAttributes: options.shaderAttributes,
          programParams: options.programParams,
          drawParams: options.drawParams,
          disableOptions: options.disableOptions,
          enableOptions: options.enableOptions,
          cullFace: options.cullFace,
          blendModeSfactor: options.blendModeSfactor,
          blendModeDfactor: options.blendModeDfactor,
          parentEventHandler: options.parentEventHandler,
          assignUniformsOnPostDescend: options.assignUniformsOnPostDescend,
          debug: options.debug
        });
      }
      
      materialNode = scene.constructNode('SceneGraphNode', options);
      redrawEventHandler = materialNode.constructEventHandlerNode('Redraw');

      shader.getRedrawEventHandler().appendChildEventHandler(redrawEventHandler);

      materialNode.getShaderNode = function() {
        return shader;
      };
      materialNode.getVBORequirements = function() {
        return shader.getVBORequirements();
      };
    }
    else {
      // The shader and the material properties are stored in the same node.
      // we simply extend the shader with the material paramters. 
      materialNode = scene.constructNode('Shader', options);
      redrawEventHandler = materialNode.getRedrawEventHandler();
    }

    var capitalizeFirstLetter = function(str) {
      return str[0].toUpperCase() + str.substr(1);
    };
    
    /////////////////////////////////
    // Material uniform interface definition.
    // Here we expose define members on our dgnode to store
    // the material uniforms, and apply operators to load those
    // values during render traversial.
    var operators = redrawEventHandler.preDescendBindings;
    if(options.assignUniformsOnPostDescend===true){
      operators = redrawEventHandler.postDescendBindings;
    }
    for (var uniformName in options.shaderUniforms) {
      var uniform = options.shaderUniforms[uniformName];
      // TODO: generalize a method for looking up uniform values from 'known owners'.
      if (uniform.owner !== undefined && uniform.owner !== 'window') {
        continue;
      }
      var uniformOwner;
      if (uniform.owner === undefined) {
        if(options.storeUniformsInDGNode){
          if(!dgnode){
            dgnode = materialNode.constructDGNode('DGNode');
            redrawEventHandler.setScope('material', dgnode);
          }
          dgnode.addMember(uniformName, uniform.type, uniform.defaultValue);
          materialNode.addMemberInterface(dgnode, uniformName, true);
          uniformOwner = 'material';
        }
        else{
          redrawEventHandler.addMember(uniformName, uniform.type, uniform.defaultValue);
          materialNode.addMemberInterface(redrawEventHandler, uniformName, true);
          uniformOwner = 'self';
        }
      }else{
        uniformOwner = uniform.owner;
      }
      
      operators.append(scene.constructOperator({
        operatorName: 'load' + capitalizeFirstLetter(uniformName),
        srcFile: 'FABRIC_ROOT/SceneGraph/KL/loadUniforms.kl',
        preProcessorDefinitions: {
          ATTRIBUTE_NAME: uniformName,
          ATTRIBUTE_ID: FABRIC.SceneGraph.getShaderParamID(uniformName),
          DATA_TYPE: uniform.type
        },
        entryFunctionName: 'loadUniform',
        parameterLayout: [
          (options.separateShaderNode ? 'shader.shaderProgram' : 'self.shaderProgram'),
          uniformOwner + '.' + uniformName
        ]
      }));
    }

    if (options.lights) {
      var addLightInterface = function(lightName, lightDef) {
        var lightStub = materialNode.constructEventHandlerNode('Draw_' + lightName);
        redrawEventHandler.appendChildEventHandler(lightStub);
        
        var setLightNodeFn = function(node) {
          if (!node.isTypeOf(lightDef.type)) {
            throw ('Incorrect type assignment. Must assign a ' + lightDef.type);
          }
          node = scene.getPrivateInterface(node);
          lightStub.appendChildEventHandler(node.getRedrawEventHandler());
        };
        materialNode.pub['set' + capitalizeFirstLetter(lightName) + 'Node'] = setLightNodeFn;
        if (lightDef.node !== undefined) {
          setLightNodeFn(lightDef.node);
        }
      };
      for (i in options.lights) {
        addLightInterface(i, options.lights[i]);
      }
    }
    if (options.textures) {
      var addTextureInterface = function(textureName, textureDef, textureUnit) {
        var textureStub = materialNode.constructEventHandlerNode(textureName + '_Stub');
        textureStub.setScopeName('textureStub');
        textureStub.addMember('textureUnit', 'Integer', textureUnit);
        redrawEventHandler.appendChildEventHandler(textureStub);
        
        textureStub.preDescendBindings.append(scene.constructOperator({
          operatorName: 'load' + textureName + 'TextureUnit',
          srcFile: 'FABRIC_ROOT/SceneGraph/KL/loadUniforms.kl',
          preProcessorDefinitions: {
            ATTRIBUTE_NAME: capitalizeFirstLetter(textureName),
            ATTRIBUTE_ID: FABRIC.SceneGraph.getShaderParamID(textureName),
            DATA_TYPE: 'Integer'
          },
          entryFunctionName: 'loadUniform',
          parameterLayout: [
            'shader.shaderProgram',
            'self.textureUnit'
          ]
        }));

        // Now add a method to assign the texture to the material
        var setTextureFn = function(node) {
          if (!node.isTypeOf('Texture')) {
            throw ('Incorrect type assignment. Must assign a Texture');
          }
          node = scene.getPrivateInterface(node);
          textureStub.appendChildEventHandler(node.getRedrawEventHandler());
        };
        materialNode.pub['set' + capitalizeFirstLetter(textureName) + 'Node'] = setTextureFn;

        if (textureDef.node !== undefined) {
          setTextureFn(textureDef.node);
        }
      };
      var textureUnit = 0;
      for (i in options.textures) {
        if (options.textures[i].owner !== undefined) {
          continue;
        }
        addTextureInterface(i, options.textures[i], textureUnit);
        textureUnit++;
      }
      
      redrawEventHandler.addMember('numTextures', 'Size', textureUnit);
      redrawEventHandler.postDescendBindings.append(scene.constructOperator({
        operatorName: 'unbindTextures',
        srcFile: 'FABRIC_ROOT/SceneGraph/KL/loadTexture.kl',
        entryFunctionName: 'unbindTextures',
        parameterLayout: [
          'self.numTextures'
        ]
      }));
    }
    
    return materialNode;
  }});


FABRIC.SceneGraph.registerNodeType('PointMaterial', {
  briefDesc: 'The PointMaterial node is a prototype for materials for points.',
  detailedDesc: 'The PointMaterial node is a prototype for materials for points. It introduces a new ' +
                'uniform, the pointSize, which can be used to draw points.',
  parentNodeDesc: 'Material',
  optionsDesc: {
    pointSize: 'The size of the drawn points.'
  },
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
        pointSize: 3.0
      });

    var pointMaterial = scene.constructNode('Material', options);
    var dgnode;
    if(pointMaterial.getDGNode){
      dgnode = pointMaterial.getDGNode();
    }
    else{
      dgnode = pointMaterial.constructDGNode('DGNode');
      pointMaterial.getRedrawEventHandler().setScope('material', dgnode);
    }
    dgnode.addMember('pointSize', 'Scalar', options.pointSize);
    pointMaterial.addMemberInterface(dgnode, 'pointSize', true);

    // Note: this method of setting the point size is probably obsolete.
    // TODO: Define a new effect and use material uniforms.
    pointMaterial.getRedrawEventHandler().preDescendBindings.append(scene.constructOperator({
        operatorName: 'setPointSize',
        srcFile: 'FABRIC_ROOT/SceneGraph/KL/drawPoints.kl',
        entryFunctionName: 'setPointSize',
        parameterLayout: ['material.pointSize']
      }));
    return pointMaterial;
  }});


FABRIC.SceneGraph.registerNodeType('PointSpriteMaterial', {
  briefDesc: 'The PointSpriteMaterial allows to draw sprites for each point in a Points node.',
  detailedDesc: 'The PointSpriteMaterial allows to draw sprites for each point in a Points node. This ' +
                'works both for shaders using positions as vec4 as well as vec3.',
  parentNodeDesc: 'Material',
  optionsDesc: {
    pointSize: 'The size of the drawn points.',
    positionsVec4: 'If set to true, the shader\'s positions attribute is expected to be vec4, otherwise vec3.'
  },
  factoryFn: function(options, scene) {

    scene.assignDefaults(options, {
        pointSize: 5,
        positionsVec4:false
      });

    var pointSpriteTextureNode = options.spriteTextureNode;
    if (pointSpriteTextureNode === undefined) {
      pointSpriteTextureNode = scene.constructNode('PointSpriteTexture');
    }
    options.shaderUniforms = {
      modelViewProjectionMatrix: { name: 'u_modelViewProjectionMatrix', owner: 'instance' },
      modelViewMatrix: { name: 'u_modelViewMatrix', owner: 'instance' },
      spriteTexture: { name: 'u_splatSampler', owner: 'texture' }
    };
    options.shaderAttributes = {
      vertexColors: { name: 'a_color' },
      positions: { name: 'a_position' }
    };
    
    options.textures = {
      spriteTexture: { node: pointSpriteTextureNode.pub }
    };
    options.vertexShader = FABRIC.loadResourceURL('FABRIC_ROOT/SceneGraph/Shaders/PointSpriteVertexShader.glsl');
    options.fragmentShader = FABRIC.loadResourceURL('FABRIC_ROOT/SceneGraph/Shaders/PointSpriteFragmentShader.glsl');

    var pointSpriteMaterialNode = scene.constructNode('Material', options);
    
    // TODO: Stop using fixed function pipeline calls. Use Geometry shaders
    var redrawEventHandler = pointSpriteMaterialNode.getRedrawEventHandler();
    redrawEventHandler.addMember('pointSize', 'Scalar', options.pointSize);
    pointSpriteMaterialNode.addMemberInterface(redrawEventHandler, 'pointSize', true);
    
    redrawEventHandler.preDescendBindings.append(scene.constructOperator({
        operatorName: 'preDrawSpritePoints',
        srcFile: 'FABRIC_ROOT/SceneGraph/KL/drawPoints.kl',
        entryFunctionName: 'preDrawSpritePoints',
        parameterLayout: ['self.pointSize']
      }));
    redrawEventHandler.postDescendBindings.append(scene.constructOperator({
        operatorName: 'postDrawSpritePoints',
        srcFile: 'FABRIC_ROOT/SceneGraph/KL/drawPoints.kl',
        entryFunctionName: 'postDrawSpritePoints',
        parameterLayout: []
      }));

    return pointSpriteMaterialNode;
  }});


FABRIC.SceneGraph.registerNodeType('ShadowMapMaterial', {
  briefDesc: 'The ShadowMapMaterial allows to draw a shadow.',
  detailedDesc: 'The ShadowMapMaterial allows to draw a shadow. This is used when working with shadow maps.',
  parentNodeDesc: 'Material',
  factoryFn: function(options, scene) {
    options.parentEventHandler = scene.getBeginRenderShadowMapEventHandler();
    var shadowMapMaterial = scene.constructNode('Material', options);
    return shadowMapMaterial;
  }});

FABRIC.SceneGraph.registerNodeType('TransparentMaterial', {
  briefDesc: 'The TransparentMaterial is a protoype for all transparent materials.',
  detailedDesc: 'The TransparentMaterial is a protoype for all transparent materials. It uses a different redraw event handler' +
                ' to ensure that the transparent objects are drawn last.',
  parentNodeDesc: 'Material',
  factoryFn: function(options, scene) {
    options.parentEventHandler = scene.getSceneRedrawTransparentObjectsEventHandler();
    var transparentMaterial = scene.constructNode('Material', options);
    return transparentMaterial;
  }});


FABRIC.SceneGraph.registerNodeType('PostProcessEffect', {
  briefDesc: 'The PostProcessEffect node allows to compute an effect after the drawing of the viewport.',
  detailedDesc: 'The PostProcessEffect node allows to compute an effect after the drawing of the viewport. It utilizes a GLSL shader which operates ' +
                'on the framebuffer of the main viewport.',
  parentNodeDesc: 'Material',
  optionsDesc: {
    fragmentShader: 'The fragment shader to use for the post effect.',
    vertexShader: 'The optional vertex shader to use for the post effect.',
    shaderAttributes: 'The attributes of the shader to use.',
    shaderUniforms: 'The uniforms of the shader to the use.',
    renderTarget: 'The render target to use for this post process effect. By default this is a new rendertarget.'
  },
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
        fragmentShader: undefined,
        vertexShader: undefined,
        shaderAttributes: undefined,
        shaderUniforms: undefined,
        parentEventHandler: false,
        separateShaderNode: false,
        assignUniformsOnPostDescend:true,
        renderTarget: FABRIC.RT.oglPostProcessingRenderTarget(0)
      });

    if (options.fragmentShader === undefined) {
      throw 'No pixel shader specified';
    }
    if (!options.vertexShader) {
      options.vertexShader =
        'attribute vec4 a_position;' +
        'attribute vec4 a_texCoord;' +
        'void main() {' +
        '  gl_TexCoord[0].st = a_texCoord.xy;' +
        '  gl_Position = a_position;' +
        '}';
    }

    options.shaderAttributes = scene.assignDefaults(options.shaderAttributes, {
      positions: { name: 'a_position' },
      uvs0: { name: 'a_texCoord' }
    });
    options.shaderUniforms = scene.assignDefaults(options.shaderUniforms, {
      fboTexture: { name: 'u_rgbaImage', owner: 'fbo' }
    });

    var postProcessEffect = scene.constructNode('Material', options);
    var redrawEventHandler = postProcessEffect.getRedrawEventHandler();

    // Set up FBO rendering and draw the textured quad on the way back
    redrawEventHandler.addMember('renderTarget', 'OGLRenderTarget', options.renderTarget);
    
    redrawEventHandler.preDescendBindings.append(
      scene.constructOperator({
          operatorName: 'bindScreenRenderTarget',
          srcFile: 'FABRIC_ROOT/SceneGraph/KL/renderTarget.kl',
          entryFunctionName: 'bindScreenRenderTarget',
          parameterLayout: [
            'window.width',
            'window.height',
            'self.renderTarget'
          ]
        }));
    redrawEventHandler.postDescendBindings.insert(
      scene.constructOperator({
          operatorName: 'unbindRenderTarget',
          srcFile: 'FABRIC_ROOT/SceneGraph/KL/renderTarget.kl',
          entryFunctionName: 'unbindRenderTarget',
          parameterLayout: [
            'self.renderTarget'
          ]
        }), 0);
    redrawEventHandler.postDescendBindings.append(
      scene.constructOperator({
          operatorName: 'drawRenderTargetToView',
          srcFile: 'FABRIC_ROOT/SceneGraph/KL/renderTarget.kl',
          entryFunctionName: 'drawRenderTargetToView',
          parameterLayout: [
            'self.renderTarget',
            'self.shaderProgram'
          ]
        }));
    return postProcessEffect;
  }}
);

/**
 * Function to create an effect based on an
 * effect xml file.
 * @param {string} effectfile The path to the xml file.
 */
FABRIC.SceneGraph.defineEffectFromFile = function(effectName, effectfile) {
  
  var preprocessorDirectives,
      effectParameters,
      separateShaderNode = false;
  
  var parseEffectFile = function(){
    var xmlText,
      parser,
      xmlDoc,
      xmlRoot,
      effectFilePathArray,
      effectFilePath,
      collectUniforms,
      collectAttributes,
      collectLights,
      collectTextures,
      collectProgramParams,
      collectPreprocessorDirectives,
      collectShaderSource,
      len,
      i,
      childNode;
      
    preprocessorDirectives = {};
    effectParameters = {
      prototypeMaterialType: 'Material',
      separateShaderNode:false
    };
  
    xmlText = FABRIC.loadResourceURL(effectfile, 'text/xml');
    parser = new DOMParser();
    xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    xmlRoot = xmlDoc.firstChild;
    effectFilePathArray = effectfile.split('/');
    effectFilePathArray.pop();
    effectFilePath = effectFilePathArray.join('/') + '/';
  
    if (xmlRoot.nodeName !== 'shader') {
      throw ':XML file must define a shader.';
    }
  
    collectUniforms = function(node) {
      var len, j, uniformNode, uniformName;
      effectParameters.shaderUniforms = {};
      len = node.childNodes.length;
      for (j = 0; j < len; j++) {
        if (node.childNodes[j].nodeName === '#text') {
          continue;
        }
        uniformNode = node.childNodes[j];
        uniformName = uniformNode.getAttribute('constant');
        effectParameters.shaderUniforms[uniformName] = {
          name: uniformNode.getAttribute('name')
        };
        if (uniformNode.getAttribute('type')) {
          effectParameters.shaderUniforms[uniformName].type = uniformNode.getAttribute('type');
        }else{
          throw 'missing type information :' + uniformName + ' in effect file :' + effectfile;
        }
        if (uniformNode.getAttribute('defaultValue')) {
          effectParameters.shaderUniforms[uniformName].defaultValue = eval(uniformNode.getAttribute('defaultValue'));
        }
        if (uniformNode.getAttribute('owner')) {
          effectParameters.shaderUniforms[uniformName].owner = uniformNode.getAttribute('owner');
        }else{
          effectParameters.separateShaderNode = true;
        }
        if (uniformNode.getAttribute('state')) {
          effectParameters.shaderUniforms[uniformName].state = uniformNode.getAttribute('state');
        }
      }
    };
  
    collectAttributes = function(node) {
      var len, j, attributeNode;
      effectParameters.shaderAttributes = {};
      len = node.childNodes.length;
      for (j = 0; j < len; j++) {
        if (node.childNodes[j].nodeName === '#text') {
          continue;
        }
        attributeNode = node.childNodes[j];
        effectParameters.shaderAttributes[attributeNode.getAttribute('binding')] = {
          name: attributeNode.getAttribute('name')
        };
      }
    };
  
    collectLights = function(node) {
      var len, j, lightNode;
      effectParameters.lights = {};
      len = node.childNodes.length;
      for (j = 0; j < len; j++) {
        if (node.childNodes[j].nodeName === '#text') {
          continue;
        }
        lightNode = node.childNodes[j];
        effectParameters.lights[lightNode.getAttribute('binding')] = {
          type: lightNode.getAttribute('type')
        };
        if (lightNode.getAttribute('shadowMap')) {
          effectParameters.lights[lightNode.getAttribute('binding')].shadowMap = lightNode.getAttribute('shadowMap');
        }
      }
    };
  
    collectTextures = function(node) {
      var len, j, textureNode, textureName;
      effectParameters.textures = {};
      len = node.childNodes.length;
      for (j = 0; j < len; j++) {
        if (node.childNodes[j].nodeName === '#text') {
          continue;
        }
        textureNode = node.childNodes[j];
        textureName = textureNode.getAttribute('binding');
        effectParameters.textures[textureName] = {
          name: textureName
        };
        if (textureNode.getAttribute('owner')) {
          effectParameters.textures[textureName].owner = textureNode.getAttribute('owner');
        }
      }
    };
  
    collectProgramParams = function(node) {
      var len, j, paramNode, paramValue;
      effectParameters.programParams = {};
      len = node.childNodes.length;
      for (j = 0; j < len; j++) {
        if (node.childNodes[j].nodeName === '#text') {
          continue;
        }
        paramNode = node.childNodes[j];
        paramValue = paramNode.getAttribute('value');
        if (isNaN(parseInt(paramValue, 10))) {
          effectParameters.programParams[paramNode.getAttribute('name')] = FABRIC.SceneGraph.OpenGLConstants[paramValue];
        }
        else {
          effectParameters.programParams[paramNode.getAttribute('name')] = parseInt(paramValue, 10);
        }
      }
    };
  
    collectDrawParams = function(node) {
      var len, j, paramNode;
      effectParameters.drawParams = {};
      len = node.childNodes.length;
      for (j = 0; j < len; j++) {
        paramNode = node.childNodes[j];
        switch (node.childNodes[j].nodeName ) {
          case '#text':
            continue;
          case 'drawMode':
            effectParameters.drawParams.drawMode = paramNode.getAttribute('value');
            break;
          case 'patchVertices':
            effectParameters.drawParams.patchVertices = parseInt(paramNode.getAttribute('value'));
            break;
        }
      }
    };
    
    collectOGLStateParams = function(node) {
      var collectParamArray = function(node) {
        var len, j, paramNode;
        var vals = [];
        len = node.childNodes.length;
        for (j = 0; j < len; j++) {
          paramNode = node.childNodes[j];
          switch (paramNode.nodeName ) {
            case '#text':
              continue;
            default:
              vals.push(FABRIC.SceneGraph.OpenGLConstants[paramNode.firstChild.data]);
              break;
          }
        }
        return vals;
      }
      
      var len, j, paramNode, paramValue;
      effectParameters.drawParams = {};
      len = node.childNodes.length;
      for (j = 0; j < len; j++) {
        paramNode = node.childNodes[j];
        switch (paramNode.nodeName ) {
          case '#text':
            continue;
          case 'disableOptions':
            effectParameters.disableOptions = collectParamArray(paramNode);
            break;
          case 'enableOptions':
            effectParameters.enableOptions = collectParamArray(paramNode);
            break;
          case 'cullFace':
            effectParameters.cullFace = FABRIC.SceneGraph.OpenGLConstants[paramNode.firstChild.data];
            break;
          case 'blendModeSfactor':
            effectParameters.blendModeSfactor = FABRIC.SceneGraph.OpenGLConstants[paramNode.firstChild.data];
            break;
          case 'blendModeDfactor':
            effectParameters.blendModeDfactor = FABRIC.SceneGraph.OpenGLConstants[paramNode.firstChild.data];
            break;
        }
      }
    };
  
    collectPreprocessorDirectives = function(node) {
      var len, j, directiveNode;
      len = node.childNodes.length;
      for (j = 0; j < len; j++) {
        if (node.childNodes[j].nodeName === '#text') {
          continue;
        }
        directiveNode = node.childNodes[j];
        preprocessorDirectives[directiveNode.getAttribute('binding')] = directiveNode.getAttribute('name');
      }
    };
  
    collectShaderSource = function(node) {
      var len, j, source = '';
      len = node.childNodes.length;
      for (j = 0; j < len; j++) {
        if (node.childNodes[j].nodeName === 'source') {
          source = source + node.childNodes[j].textContent;
        }
        if (node.childNodes[j].nodeName === 'include') {
          // Included file paths are relative to the effect file.
          var path = node.childNodes[j].getAttribute('file');
          if (path.split('/')[0] !== 'FABRIC_ROOT') {
            path = effectFilePath + path;
          }
          source = source + FABRIC.loadResourceURL(path, 'text/plain');
        }
      }
      return source;
    };
  
    len = xmlRoot.childNodes.length;
    for (i = 0; i < len; i++) {
      childNode = xmlRoot.childNodes[i];
      switch (childNode.nodeName) {
        case '#text':
          continue;
        case 'name':
          effectParameters.name = childNode.firstChild.data;
          break;
        case 'prototypeMaterialType':
          effectParameters.prototypeMaterialType = childNode.firstChild.data;
          break;
        case 'uniforms':
          collectUniforms(childNode);
          break;
        case 'attributes':
          collectAttributes(childNode);
          break;
        case 'lights':
          collectLights(childNode);
          break;
        case 'textures':
          collectTextures(childNode);
          break;
        case 'programParams':
          collectProgramParams(childNode);
          break;
        case 'drawParams':
          collectDrawParams(childNode);
          break;
        case 'openglstateparams':
          collectOGLStateParams(childNode);
          break;
        case 'preprocessordirectives':
          collectPreprocessorDirectives(childNode);
          break;
        case 'vertexshader':
          effectParameters.vertexShader = collectShaderSource(childNode);
          break;
        case 'tesscontrolshader':
          effectParameters.tessControlShader = collectShaderSource(childNode);
          break;
        case 'tessevalshader':
          effectParameters.tessEvalShader = collectShaderSource(childNode);
          break;
        case 'geometryshader':
          effectParameters.geometryShader = collectShaderSource(childNode);
          break;
        case 'fragmentshader':
          effectParameters.fragmentShader = collectShaderSource(childNode);
          break;
        default:
          console.warn(effectfile + ': Unhandled Effect Parameter:' + childNode.nodeName);
      }
    }
  }

  FABRIC.SceneGraph.registerNodeType(effectName, {
    briefDesc: 'The '+effectName+' node is a xml based GLSL shader.',
    detailedDesc: 'The '+effectName+' GLSL shader is implemented in "'+effectfile+'".',
    factoryFn: function(options, scene) {
      if(!effectParameters){
        parseEffectFile();
      }
      scene.assignDefaults(options, effectParameters);
      var directives = {},
        preProcessCode = false,
        i,
        materialNode,
        uniformName,
        lightName,
        textureName,
        setterName;

      directives = {};
      preProcessCode = false;
      for (i in preprocessorDirectives) {
        if (!options[i]) {
          throw ('Error costructing ' + effectParameters.name + '. ' +
                 'Preprocessor directive not defined:' + preprocessorDirectives[i]);
        }
        directives[preprocessorDirectives[i]] = options[i];
        preProcessCode = true;
      }
      if (preProcessCode) {
        if (effectParameters.vertexShader) {
          options.vertexShader = scene.preProcessCode(effectParameters.vertexShader, directives);
        }
        if (effectParameters.tessControlShader) {
          options.tessControlShader = scene.preProcessCode(effectParameters.tessControlShader, directives);
        }
        if (effectParameters.tessEvalShader) {
          options.tessEvalShader = scene.preProcessCode(effectParameters.tessEvalShader, directives);
        }
        if (effectParameters.geometryShader) {
          options.geometryShader = scene.preProcessCode(effectParameters.geometryShader, directives);
        }
        if (effectParameters.fragmentShader) {
          options.fragmentShader = scene.preProcessCode(effectParameters.fragmentShader, directives);
        }
        options.shaderNameDecoration = '';
        for (i in directives) {
          options.shaderNameDecoration = options.shaderNameDecoration + i + directives[i];
        }
      }

      materialNode = scene.constructNode(options.prototypeMaterialType, options);
      
      var capitalizeFirstLetter = function(str) {
        return str[0].toUpperCase() + str.substr(1);
      };
      for (uniformName in effectParameters.shaderUniforms) {
        if (options[uniformName] != undefined && materialNode.pub['set' + capitalizeFirstLetter(uniformName)]) {
          materialNode.pub['set' + capitalizeFirstLetter(uniformName)](options[uniformName]);
        }
      }
      for (lightName in effectParameters.lights) {
        if (options[lightName + 'Node'] && materialNode.pub['set' + capitalizeFirstLetter(lightName) + 'Node']) {
          materialNode.pub['set' + capitalizeFirstLetter(lightName) + 'Node'](options[lightName + 'Node']);
        }
      }
      for (textureName in effectParameters.textures) {
        if (options[textureName + 'Node']) {
          materialNode.pub['set' + capitalizeFirstLetter(textureName) + 'Node'](options[textureName + 'Node']);
        }
      }
      return materialNode;
    }});
};

FABRIC.SceneGraph.defineEffectFromFile('EmptyMaterial', 'FABRIC_ROOT/SceneGraph/Shaders/EmptyShader.xml');
FABRIC.SceneGraph.defineEffectFromFile('FlatMaterial', 'FABRIC_ROOT/SceneGraph/Shaders/FlatShader.xml');
FABRIC.SceneGraph.defineEffectFromFile('FlatScreenSpaceMaterial', 'FABRIC_ROOT/SceneGraph/Shaders/FlatScreenSpaceShader.xml');
FABRIC.SceneGraph.defineEffectFromFile('PhongMaterial', 'FABRIC_ROOT/SceneGraph/Shaders/PhongShader.xml');
FABRIC.SceneGraph.defineEffectFromFile('ShadowMaterial', 'FABRIC_ROOT/SceneGraph/Shaders/ShadowMapShader.xml');

FABRIC.SceneGraph.defineEffectFromFile('FlatTextureMaterial', 'FABRIC_ROOT/SceneGraph/Shaders/FlatTextureShader.xml');
FABRIC.SceneGraph.defineEffectFromFile('FlatUVMaterial', 'FABRIC_ROOT/SceneGraph/Shaders/FlatUVShader.xml');
FABRIC.SceneGraph.defineEffectFromFile('FlatBlendTextureMaterial', 'FABRIC_ROOT/SceneGraph/Shaders/FlatBlendTextureShader.xml');
FABRIC.SceneGraph.defineEffectFromFile('PhongInstancingMaterial', 'FABRIC_ROOT/SceneGraph/Shaders/PhongInstancingShader.xml');
FABRIC.SceneGraph.defineEffectFromFile('PhongInstancingExtMaterial', 'FABRIC_ROOT/SceneGraph/Shaders/PhongInstancingExtShader.xml');
FABRIC.SceneGraph.defineEffectFromFile('PhongTextureMaterial', 'FABRIC_ROOT/SceneGraph/Shaders/PhongTextureShader.xml');
FABRIC.SceneGraph.defineEffectFromFile('PhongTextureSimpleMaterial', 'FABRIC_ROOT/SceneGraph/Shaders/PhongTextureShaderSimple.xml');
FABRIC.SceneGraph.defineEffectFromFile('PhongBumpReflectMaterial', 'FABRIC_ROOT/SceneGraph/Shaders/PhongBumpReflectShader.xml');
FABRIC.SceneGraph.defineEffectFromFile('PhongSkinningMaterial', 'FABRIC_ROOT/SceneGraph/Shaders/PhongSkinningShader.xml');

FABRIC.SceneGraph.defineEffectFromFile('ShadowReceivingPhongMaterial', 'FABRIC_ROOT/SceneGraph/Shaders/ShadowReceivingPhongShader.xml');
FABRIC.SceneGraph.defineEffectFromFile('PhongBumpReflectSkinningMaterial', 'FABRIC_ROOT/SceneGraph/Shaders/PhongBumpReflectSkinningShader.xml');

FABRIC.SceneGraph.defineEffectFromFile('VertexColorMaterial', 'FABRIC_ROOT/SceneGraph/Shaders/VertexColorShader.xml');
FABRIC.SceneGraph.defineEffectFromFile('PhongVertexColorMaterial', 'FABRIC_ROOT/SceneGraph/Shaders/PhongVertexColorShader.xml');
FABRIC.SceneGraph.defineEffectFromFile('NormalMaterial', 'FABRIC_ROOT/SceneGraph/Shaders/NormalShader.xml');

FABRIC.SceneGraph.defineEffectFromFile('PhongTesselationMaterial', 'FABRIC_ROOT/SceneGraph/Shaders/PhongTesselationShader.xml');
FABRIC.SceneGraph.defineEffectFromFile('HairMaterial', 'FABRIC_ROOT/SceneGraph/Shaders/HairShader.xml');
FABRIC.SceneGraph.defineEffectFromFile('HairTextureMaterial', 'FABRIC_ROOT/SceneGraph/Shaders/HairTextureShader.xml');

FABRIC.SceneGraph.defineEffectFromFile('PhongReflectMaterial', 'FABRIC_ROOT/SceneGraph/Shaders/PhongReflectShader.xml');
FABRIC.SceneGraph.defineEffectFromFile('GlassMaterial', 'FABRIC_ROOT/SceneGraph/Shaders/GlassShader.xml');
FABRIC.SceneGraph.defineEffectFromFile('WireframeMaterial', 'FABRIC_ROOT/SceneGraph/Shaders/WireframeShader.xml');

FABRIC.SceneGraph.defineEffectFromFile('OutlineShader', 'FABRIC_ROOT/SceneGraph/Shaders/OutlineShader.xml');

FABRIC.SceneGraph.defineEffectFromFile('PointFlatMaterial', 'FABRIC_ROOT/SceneGraph/Shaders/PointFlatShader.xml');


FABRIC.SceneGraph.registerNodeType('BloomPostProcessEffect', {
  briefDesc: 'The BloomPostProcessEffect node draws a bloom effect after the viewport has been drawn.',
  detailedDesc: 'The BloomPostProcessEffect node draws a bloom effect after the viewport has been drawn.',
  parentNodeDesc: 'PostProcessEffect',
  factoryFn: function(options, scene) {
    options.fragmentShader = FABRIC.loadResourceURL('FABRIC_ROOT/SceneGraph/Shaders/BloomPixelShader.glsl');

    var bloomPostProcessEffect = scene.constructNode('PostProcessEffect', options);
    return bloomPostProcessEffect;
  }});


FABRIC.SceneGraph.registerNodeType('FilmicTonemapperPostProcessEffect', {
  briefDesc: 'The FilmicTonemapperPostProcessEffect node draws a filmic tone mapping effect after the viewport has been drawn.',
  detailedDesc: 'The FilmicTonemapperPostProcessEffect node draws a filmic tone mapping effect after the viewport has been drawn.',
  parentNodeDesc: 'PostProcessEffect',
  factoryFn: function(options, scene) {
    options.fragmentShader = FABRIC.loadResourceURL('FABRIC_ROOT/SceneGraph/Shaders/FilmicTonemapper.glsl');

    var filmicTonemapperEffect = scene.constructNode('PostProcessEffect', options);
    return filmicTonemapperEffect;
  }});


FABRIC.SceneGraph.registerNodeType('EdgeDetectionPostProcessEffect', {
  briefDesc: 'The EdgeDetectionPostProcessEffect node draws an edge detection filter effect after the viewport has been drawn.',
  detailedDesc: 'The EdgeDetectionPostProcessEffect node draws a edge detection filter effect after the viewport has been drawn.',
  parentNodeDesc: 'PostProcessEffect',
  factoryFn: function(options, scene) {
    options.fragmentShader = FABRIC.loadResourceURL('FABRIC_ROOT/SceneGraph/Shaders/EdgeDetectionPixelShader.glsl');

    options.shaderUniforms = {
      width: { name: 'u_width', owner: 'window', type:'Integer' },
      height: { name: 'u_height', owner: 'window', type:'Integer' },
      colorMix: { name: 'u_colorMix', type:'Scalar' }
    };

    var edgeDetectionEffect = scene.constructNode('PostProcessEffect', options);
    return edgeDetectionEffect;
  }});


FABRIC.SceneGraph.registerNodeType('GaussianBlurPostProcessEffect', {
  briefDesc: 'The GaussianBlurPostProcessEffect node draws a gaussian blur effect after the viewport has been drawn.',
  detailedDesc: 'The GaussianBlurPostProcessEffect node draws a gaussian blur effect after the viewport has been drawn.',
  parentNodeDesc: 'PostProcessEffect',
  factoryFn: function(options, scene) {
    options.fragmentShader = FABRIC.loadResourceURL('FABRIC_ROOT/SceneGraph/Shaders/GaussianBlurFragmentShader.glsl');

    options.shaderUniforms = {
      blurSize: { name: 'u_blurSize', defaultValue: 1.0 / 512.0, type:'Scalar' }
    };

    var edgeDetectionEffect = scene.constructNode('PostProcessEffect', options);
    return edgeDetectionEffect;
  }});

FABRIC.SceneGraph.registerNodeType('ScreenGrab', {
  briefDesc: 'The ScreenGrab node stores the viewport to an Image node.',
  detailedDesc: 'The ScreenGrab node stores the viewport to an Image node by encoding PNG using a ResourceLoadNode. ',
  parentNodeDesc: 'SceneGraphNode',
  factoryFn: function(options, scene) {
    //TO refine: right now this node is grabbing a screenshot constantly!
    //We should include a way to 'mute' and 'unmute' it. The problem
    //is how to know when it is filled with content; an event should be sent. Can
    //we do this without modifying the core?
    var screenGrabNode = scene.constructNode('SceneGraphNode', options),
    screenGrabEventHandler;

    screenGrabEventHandler = screenGrabNode.constructEventHandlerNode('ScreenGrab');
    screenGrabEventHandler.addMember('width', 'Size');
    screenGrabEventHandler.addMember('height', 'Size');
    screenGrabEventHandler.addMember('pixels', 'RGBA[]');
    screenGrabEventHandler.addMember('resource', 'FabricResource');

    screenGrabEventHandler.postDescendBindings.append(scene.constructOperator({
      operatorName: 'grabViewport',
      srcFile: 'FABRIC_ROOT/SceneGraph/KL/grabViewport.kl',
      entryFunctionName: 'grabViewport',
      parameterLayout: [
            'self.width',
            'self.height',
            'self.pixels'
          ]
    }));

    screenGrabEventHandler.postDescendBindings.append(scene.constructOperator({
      operatorName: 'encodeImage',
      srcFile: 'FABRIC_ROOT/SceneGraph/KL/encodeImage.kl',
      entryFunctionName: 'encodeImageLDR',
      parameterLayout: [
            'self.width',
            'self.height',
            'self.pixels',
            'self.resource'
          ]
    }));

    scene.getScenePostRedrawEventHandler().appendChildEventHandler(screenGrabEventHandler);

    screenGrabNode.pub.saveAs = function() {
      try {
          screenGrabEventHandler.putResourceToUserFile('resource', 'Save Screen Grab Image As...', undefined, 'fabricScreenGrab');
      }
      catch (e) { }
    };

    return screenGrabNode;
  }
});

