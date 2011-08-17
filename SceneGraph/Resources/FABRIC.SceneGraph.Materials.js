
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//


FABRIC.SceneGraph.registerNodeType('Texture', {
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
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
      wantHDR: false,
      wantRGBA: true,
      createResourceLoadNode: true,
      createLoadTextureEventHandler: true
    });

    var imageLoaded = false,
      redrawEventHandler,
      ext = options.url ? options.url.substr(options.url.lastIndexOf('.') + 1) : undefined,
      dgnode,
      resourceLoadNode,
      resourceloaddgnode;

    imageNode = scene.constructNode('Texture', options);
    dgnode = imageNode.constructDGNode('DGNode')
    dgnode.addMember('hdr', 'Boolean', options.wantHDR);
    dgnode.addMember('width', 'Size');
    dgnode.addMember('height', 'Size');
    dgnode.addMember('pixels', (options.wantHDR ? 'Color' : (options.wantRGBA ? 'RGBA' : 'RGB')) + '[]');

    imageNode.addMemberInterface(dgnode, 'width');
    imageNode.addMemberInterface(dgnode, 'height');

    if (options.createResourceLoadNode) {
      resourceLoadNode = scene.constructNode('ResourceLoad', options);
      resourceloaddgnode = resourceLoadNode.getDGLoadNode();
      dgnode.addDependency(resourceloaddgnode, 'resource');

      dgnode.bindings.append(scene.constructOperator({
        operatorName: (options.wantHDR ? 'loadImageHDR' : 'loadImageLDR'),
        parameterLayout: [
              'resource.resource',
              'self.width',
              'self.height',
              'self.pixels'
            ],
        entryFunctionName: (options.wantHDR ? 'loadImageHDR' : 'loadImageLDR'),
        srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/loadTexture.kl'
      }));

      imageNode.getResourceLoadNode = function() {
        return resourceLoadNode;
      };

      imageNode.isImageLoaded = function() {
        return resourceLoadNode ? resourceLoadNode.pub.isLoaded() : false;
      };
    }

    if (options.createLoadTextureEventHandler) {
      // Construct the handler for loading the image into texture memory.
      redrawEventHandler = imageNode.constructEventHandlerNode('Redraw');
      redrawEventHandler.addScope('image', dgnode);
      redrawEventHandler.addMember('oglTexture2D', 'OGLTexture2D', FABRIC.RT.oglTexture2D());
      redrawEventHandler.preDescendBindings.append(scene.constructOperator({
        operatorName: 'bindTextureLDR',
        srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/loadTexture.kl',
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

    imageNode.getURL = function() {
      return resourceLoadNode ? resourceLoadNode.pub.getUrl() : '';
    };

    return imageNode;
  }});

FABRIC.SceneGraph.registerNodeType('Video', {
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
        localFileName: ''
      });

    // ensure to use the right settings for video
    options.createResourceLoadNode = false;
    options.createLoadTextureEventHandler = false;
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
    dgnode.addDependency(scene.getGlobalsNode(), 'globals');

    dgnode.bindings.append(scene.constructOperator({
      operatorName: 'videoLoadInfo',
      srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/loadVideo.kl',
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
      srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/loadVideo.kl',
      entryFunctionName: 'videoSeekTime',
      parameterLayout: [
        'self.stream',
        'globals.ms'
      ]
    }));

    dgnode.bindings.append(scene.constructOperator({
      operatorName: 'videoGetPixels',
      srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/loadVideo.kl',
      entryFunctionName: 'videoGetPixels',
      parameterLayout: [
        'self.stream',
        'self.width',
        'self.height',
        'self.pixels'
      ]
    }));

    var redrawEventHandler = videoNode.constructEventHandlerNode('Redraw');
    redrawEventHandler.addScope('video', dgnode);
    redrawEventHandler.addMember('bufferID', 'Size', 0);
    redrawEventHandler.preDescendBindings.append(scene.constructOperator({
        operatorName: 'videoLoadToGPU',
        srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/loadVideo.kl',
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
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
        spriteResolution: 32
      });
    
    var pointSpriteTextureNode = scene.constructNode('Texture', options);
    
    var dgnode = pointSpriteTextureNode.constructDGNode('DGNode');
    dgnode.addMember('resolution', 'Integer', options.spriteResolution);

    var redrawEventHandler = pointSpriteTextureNode.constructEventHandlerNode('Redraw');
    redrawEventHandler.addScope('image', dgnode);
    redrawEventHandler.addMember('bufferID', 'Size', 0);
    redrawEventHandler.preDescendBindings.append(scene.constructOperator({
            operatorName: 'createSpriteTexture',
            srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/loadTexture.kl',
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
      srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/loadShader.kl',
      entryFunctionName: 'loadShader',
      parameterLayout: [
        'self.shaderProgram'
      ]
    });
    
    if(options.assignUniformsOnPostDescend == true){
      // Post Processing operators invoke the shader on the post
      // decent pass. After thegeometry in the sub tree is drawn.
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
        srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/loadShader.kl',
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
          assignUniformsOnPostDescend: options.assignUniformsOnPostDescend
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
            redrawEventHandler.addScope('material', dgnode);
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
        srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/loadUniforms.kl',
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
          operatorName: 'loadIntegerUniform',
          srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/loadUniforms.kl',
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
    }

    return materialNode;
  }});


FABRIC.SceneGraph.registerNodeType('PointMaterial', {
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
      pointMaterial.getRedrawEventHandler().addScope('material', dgnode);
    }
    dgnode.addMember('pointSize', 'Scalar', options.pointSize);
    pointMaterial.addMemberInterface(dgnode, 'pointSize', true);

    // Note: this method of setting the point size is probably obsolete.
    // TODO: Define a new effect and use material uniforms.
    pointMaterial.getRedrawEventHandler().preDescendBindings.append(scene.constructOperator({
        operatorName: 'setPointSize',
        srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/drawPoints.kl',
        entryFunctionName: 'setPointSize',
        parameterLayout: ['material.pointSize']
      }));
    return pointMaterial;
  }});


FABRIC.SceneGraph.registerNodeType('PointSpriteMaterial', {
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
    options.vertexShader = FABRIC.loadResourceURL('FABRIC_ROOT/SceneGraph/Resources/Shaders/PointSpriteVertexShader.glsl');
    options.fragmentShader = FABRIC.loadResourceURL('FABRIC_ROOT/SceneGraph/Resources/Shaders/PointSpriteFragmentShader.glsl');

    var pointSpriteMaterialNode = scene.constructNode('Material', options);
    
    // TODO: Stop using fixed function pipeline calls. Use Geometry shaders
    var redrawEventHandler = pointSpriteMaterialNode.getRedrawEventHandler();
    redrawEventHandler.addMember('pointSize', 'Scalar', options.pointSize);
    pointSpriteMaterialNode.addMemberInterface(redrawEventHandler, 'pointSize', true);
    
    redrawEventHandler.preDescendBindings.append(scene.constructOperator({
        operatorName: 'preDrawSpritePoints',
        srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/drawPoints.kl',
        entryFunctionName: 'preDrawSpritePoints',
        parameterLayout: ['self.pointSize']
      }));
    redrawEventHandler.postDescendBindings.append(scene.constructOperator({
        operatorName: 'postDrawSpritePoints',
        srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/drawPoints.kl',
        entryFunctionName: 'postDrawSpritePoints',
        parameterLayout: []
      }));

    return pointSpriteMaterialNode;
  }});


FABRIC.SceneGraph.registerNodeType('TransparentMaterial', {
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
        enableOptions: [FABRIC.SceneGraph.OpenGLConstants.GL_DEPTH_TEST,
                             FABRIC.SceneGraph.OpenGLConstants.GL_BLEND],
        cullFace: FABRIC.SceneGraph.OpenGLConstants.GL_BACK,
        blendModeSfactor: FABRIC.SceneGraph.OpenGLConstants.GL_SRC_ALPHA,/*GL_SRC_ALPHA*/
        blendModeDfactor: FABRIC.SceneGraph.OpenGLConstants.GL_ONE_MINUS_SRC_ALPHA/*GL_ONE_MINUS_SRC_ALPHA*/
      });
    
    options.parentEventHandler = scene.getSceneRedrawTransparentObjectsEventHandler();
    var transparentMaterial = scene.constructNode('Material', options);
    return transparentMaterial;
  }});


FABRIC.SceneGraph.registerNodeType('PostProcessEffect', {
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
        fragmentShader: undefined,
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
          srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/renderTarget.kl',
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
          srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/renderTarget.kl',
          entryFunctionName: 'unbindRenderTarget',
          parameterLayout: [
            'self.renderTarget'
          ]
        }), 0);
    redrawEventHandler.postDescendBindings.append(
      scene.constructOperator({
          operatorName: 'drawRenderTargetToView',
          srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/renderTarget.kl',
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
      var len, j, paramNode, paramValue;
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
      var effectInstanceParameters,
        directives = {},
        preProcessCode = false,
        i,
        materialNode,
        uniformName,
        lightName,
        textureName,
        setterName;

      effectInstanceParameters = scene.cloneObj(effectParameters);
      effectInstanceParameters.name = options.name;
      effectInstanceParameters.type = options.type;
      effectInstanceParameters.parentEventHandler = options.parentEventHandler;

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
          effectInstanceParameters.vertexShader = scene.preProcessCode(effectParameters.vertexShader, directives);
        }
        if (effectParameters.tessControlShader) {
          effectInstanceParameters.tessControlShader = scene.preProcessCode(effectParameters.tessControlShader, directives);
        }
        if (effectParameters.tessEvalShader) {
          effectInstanceParameters.tessEvalShader = scene.preProcessCode(effectParameters.tessEvalShader, directives);
        }
        if (effectParameters.geometryShader) {
          effectInstanceParameters.geometryShader = scene.preProcessCode(effectParameters.geometryShader, directives);
        }
        if (effectParameters.fragmentShader) {
          effectInstanceParameters.fragmentShader = scene.preProcessCode(effectParameters.fragmentShader, directives);
        }
        options.shaderNameDecoration = '';
        for (i in directives) {
          options.shaderNameDecoration = options.shaderNameDecoration + i + directives[i];
        }
      }

      materialNode = scene.constructNode(effectParameters.prototypeMaterialType, effectInstanceParameters);
      
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

FABRIC.SceneGraph.defineEffectFromFile('EmptyMaterial', 'FABRIC_ROOT/SceneGraph/Resources/Shaders/EmptyShader.xml');
FABRIC.SceneGraph.defineEffectFromFile('FlatMaterial', 'FABRIC_ROOT/SceneGraph/Resources/Shaders/FlatShader.xml');
FABRIC.SceneGraph.defineEffectFromFile('FlatScreenSpaceMaterial', 'FABRIC_ROOT/SceneGraph/Resources/Shaders/FlatScreenSpaceShader.xml');
FABRIC.SceneGraph.defineEffectFromFile('PhongMaterial', 'FABRIC_ROOT/SceneGraph/Resources/Shaders/PhongShader.xml');
FABRIC.SceneGraph.defineEffectFromFile('ShadowMaterial', 'FABRIC_ROOT/SceneGraph/Resources/Shaders/ShadowMapShader.xml');

FABRIC.SceneGraph.defineEffectFromFile('FlatTextureMaterial', 'FABRIC_ROOT/SceneGraph/Resources/Shaders/FlatTextureShader.xml');
FABRIC.SceneGraph.defineEffectFromFile('PhongTextureMaterial', 'FABRIC_ROOT/SceneGraph/Resources/Shaders/PhongTextureShader.xml');
FABRIC.SceneGraph.defineEffectFromFile('PhongBumpReflectMaterial', 'FABRIC_ROOT/SceneGraph/Resources/Shaders/PhongBumpReflectShader.xml');
FABRIC.SceneGraph.defineEffectFromFile('PhongSkinningMaterial', 'FABRIC_ROOT/SceneGraph/Resources/Shaders/PhongSkinningShader.xml');

FABRIC.SceneGraph.defineEffectFromFile('ShadowReceivingPhongMaterial', 'FABRIC_ROOT/SceneGraph/Resources/Shaders/ShadowReceivingPhongShader.xml');
FABRIC.SceneGraph.defineEffectFromFile('PhongBumpReflectSkinningMaterial', 'FABRIC_ROOT/SceneGraph/Resources/Shaders/PhongBumpReflectSkinningShader.xml');

FABRIC.SceneGraph.defineEffectFromFile('VertexColorMaterial', 'FABRIC_ROOT/SceneGraph/Resources/Shaders/VertexColorShader.xml');
FABRIC.SceneGraph.defineEffectFromFile('PhongVertexColorMaterial', 'FABRIC_ROOT/SceneGraph/Resources/Shaders/PhongVertexColorShader.xml');
FABRIC.SceneGraph.defineEffectFromFile('NormalMaterial', 'FABRIC_ROOT/SceneGraph/Resources/Shaders/NormalShader.xml');

FABRIC.SceneGraph.defineEffectFromFile('PhongTesselationMaterial', 'FABRIC_ROOT/SceneGraph/Resources/Shaders/PhongTesselationShader.xml');
FABRIC.SceneGraph.defineEffectFromFile('HairMaterial', 'FABRIC_ROOT/SceneGraph/Resources/Shaders/HairShader.xml');

FABRIC.SceneGraph.defineEffectFromFile('GlassMaterial', 'FABRIC_ROOT/SceneGraph/Resources/Shaders/GlassShader.xml');


FABRIC.SceneGraph.registerNodeType('BloomPostProcessEffect', {
  factoryFn: function(options, scene) {
    options.fragmentShader = FABRIC.loadResourceURL('FABRIC_ROOT/SceneGraph/Resources/Shaders/BloomPixelShader.glsl');

    var bloomPostProcessEffect = scene.constructNode('PostProcessEffect', options);
    return bloomPostProcessEffect;
  }});


FABRIC.SceneGraph.registerNodeType('FilmicTonemapperPostProcessEffect', {
  factoryFn: function(options, scene) {
    options.fragmentShader = FABRIC.loadResourceURL('FABRIC_ROOT/SceneGraph/Resources/Shaders/FilmicTonemapper.glsl');

    var filmicTonemapperEffect = scene.constructNode('PostProcessEffect', options);
    return filmicTonemapperEffect;
  }});


FABRIC.SceneGraph.registerNodeType('EdgeDetectionPostProcessEffect', {
  factoryFn: function(options, scene) {
    options.fragmentShader = FABRIC.loadResourceURL('FABRIC_ROOT/SceneGraph/Resources/Shaders/EdgeDetectionPixelShader.glsl');

    options.shaderUniforms = {
      width: { name: 'u_width', owner: 'window', type:'Integer' },
      height: { name: 'u_height', owner: 'window', type:'Integer' },
      colorMix: { name: 'u_colorMix', type:'Scalar' }
    };

    var edgeDetectionEffect = scene.constructNode('PostProcessEffect', options);
    return edgeDetectionEffect;
  }});


FABRIC.SceneGraph.registerNodeType('GaussianBlurPostProcessEffect', {
  factoryFn: function(options, scene) {
    options.fragmentShader = FABRIC.loadResourceURL('FABRIC_ROOT/SceneGraph/Resources/Shaders/GaussianBlurFragmentShader.glsl');

    options.shaderUniforms = {
      blurSize: { name: 'u_blurSize', defaultValue: 1.0 / 512.0, type:'Scalar' }
    };

    var edgeDetectionEffect = scene.constructNode('PostProcessEffect', options);
    return edgeDetectionEffect;
  }});


