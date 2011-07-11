
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//


FABRIC.SceneGraph.registerNodeType('Texture',
  function(options, scene) {
    var textureNode = scene.constructNode('SceneGraphNode', options);
    return textureNode;
  });

// TODO: The texture image type needs to be broken into LDR and HDR.
// here we have HDR image loading mixed in with LDR image loading,
// but it should be a separate type.
FABRIC.SceneGraph.registerNodeType('Image',
  function(options, scene) {
    scene.assignDefaults(options, {
        onLoadCallback: undefined,
        wantHDR: false,
        wantRGBA: true,
        createResouceLoadEventHandler: true,
        createLoadTextureEventHandler: true
      });
    options.dgnodenames.push('DGNode');

    var ext = options.url ? options.url.substr(options.url.lastIndexOf('.') + 1) : undefined,
      imageLoaded = false,
      onloadCallbacks = [],
      dgResourceLoadEventHandler,
      redrawEventHandler,
      url,
      imageNode = scene.constructNode('Texture', options),
      dgnode = imageNode.getDGNode();

    dgnode.addMember('type', 'String', ext);
    dgnode.addMember('hdr', 'Boolean', options.wantHDR);
    dgnode.addMember('width', 'Size');
    dgnode.addMember('height', 'Size');
    dgnode.addMember('pixels', (options.wantHDR ? 'Color' : (options.wantRGBA ? 'RGBA' : 'RGB')) + '[]');

    imageNode.addMemberInterface(dgnode, 'width');
    imageNode.addMemberInterface(dgnode, 'height');

    if (options.onLoadCallback) {
      onloadCallbacks.push(options.onLoadCallback);
    }

    if (options.createResouceLoadEventHandler) {
        dgResourceLoadEventHandler = scene.constructEventHandlerNode(options.url);
        dgResourceLoadEventHandler.addScope('image', dgnode);
        dgResourceLoadEventHandler.preDescendBindings.append(scene.constructOperator({
            operatorName: (options.wantHDR ? 'loadImageHDR' : 'loadImageLDR'),
            parameterBinding: [
              'resource.data',
              'resource.dataSize',
              'image.type',
              'image.width',
              'image.height',
              'image.pixels'
            ],
            entryFunctionName: (options.wantHDR ? 'loadImageHDR' : 'loadImageLDR'),
            srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/loadTexture.kl'
          }));
    }

    // Construct the handler for loading the image into texture memory.
    redrawEventHandler = scene.constructEventHandlerNode(options.name + '_draw');
    redrawEventHandler.addScope('image', dgnode);
    redrawEventHandler.addMember('bufferID', 'Integer', 0);
    if (options.createLoadTextureEventHandler) {
        redrawEventHandler.preDescendBindings.append(scene.constructOperator({
            operatorName: 'loadTexture',
            srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/loadTexture.kl',
            entryFunctionName: 'createTextureFromImageLDR',
            parameterBinding: [
              'image.width',
              'image.height',
              'image.pixels',
              'self.bufferID',
              'textureStub.textureUnit'
            ]
          }));
    }
    imageNode.getRedrawEventHandler = function() {
      return redrawEventHandler;
    };

    imageNode.loadImageAsset = function(imageURL) {
      var dgResourceLoadEvent;
      url = imageURL;
      dgResourceLoadEvent = scene.constructResourceLoadEventNode(imageURL);
      dgResourceLoadEvent.appendEventHandler(dgResourceLoadEventHandler);
      dgResourceLoadEvent.didFireCallback = function() {
        var i;
        imageLoaded = true;
        for (i = 0; i < onloadCallbacks.length; i++) {
          onloadCallbacks[i].call();
        }
      };
      dgResourceLoadEvent.start();
    };

    imageNode.getURL = function() {
      return url;
    };

    imageNode.isImageLoaded = function() {
      return imageLoaded;
    };

    imageNode.addOnLoadCallback = function(callback) {
      if (imageLoaded) {
        callback.call();
      }else {
        onloadCallbacks.push(callback);
      }
    };

    if (options.url) {
      imageNode.loadImageAsset(options.url);
    }
    return imageNode;
  });

FABRIC.SceneGraph.registerNodeType('Video',
  function(options, scene) {
    scene.assignDefaults(options, {
        localFileName: ''
      });

    // ensure to use the right settings for video
    options.createResouceLoadEventHandler = false;
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
      parameterBinding: [
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
      parameterBinding: [
        'self.stream',
        'globals.ms'
      ]
    }));

    dgnode.bindings.append(scene.constructOperator({
      operatorName: 'videoGetPixels',
      srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/loadVideo.kl',
      entryFunctionName: 'videoGetPixels',
      parameterBinding: [
        'self.stream',
        'self.width',
        'self.height',
        'self.pixels'
      ]
    }));

    videoNode.getRedrawEventHandler().preDescendBindings.append(scene.constructOperator({
        operatorName: 'videoLoadToGPU',
        srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/loadVideo.kl',
        entryFunctionName: 'videoLoadToGPU',
        parameterBinding: [
          'image.width',
          'image.height',
          'image.pixels',
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
  });

FABRIC.SceneGraph.registerNodeType('PointSpriteTexture',
  function(options, scene) {
    scene.assignDefaults(options, {
        spriteResolution: 32
      });
    options.dgnodenames.push('DGNode');
    var pointSpriteTextureNode = scene.constructNode('Texture', options),
      dgnode = pointSpriteTextureNode.getDGNode(),
      redrawEventHandler = scene.constructEventHandlerNode(options.name + '_draw');

    dgnode.addMember('resolution', 'Integer', options.spriteResolution);

    redrawEventHandler.addScope('image', dgnode);
    redrawEventHandler.addMember('bufferID', 'Integer', 0);
    redrawEventHandler.preDescendBindings.append(scene.constructOperator({
            operatorName: 'createSpriteTexture',
            srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/loadTexture.kl',
            entryFunctionName: 'createSpriteTexture',
            parameterBinding: [
              'image.resolution',
              'self.bufferID',
              'textureStub.textureUnit'
            ]
          }));

    pointSpriteTextureNode.getRedrawEventHandler = function() {
      return redrawEventHandler;
    };

    return pointSpriteTextureNode;
  });


// Note: this table is added here temporarily just to get an idea of the complexity.
// TODO: this table should probably be exposed from the core. An error here would be
// super tough to track down.
/**
 * Exposing the OpenGL constants in Javascript
 */
FABRIC.SceneGraph.OpenGLConstants = {

  GL_POINTS: 0,
  GL_LINES: 1,
  GL_LINE_LOOP: 2,
  GL_LINE_STRIP: 3,
  GL_TRIANGLES: 4,
  GL_TRIANGLE_STRIP: 5,
  GL_TRIANGLE_FAN: 6,
  GL_QUADS: 7,
  GL_QUAD_STRIP: 8,
  GL_POLYGON: 9,

  GL_FRAGMENT_SHADER: 35632,
  GL_VERTEX_SHADER: 35633,

  GL_LINES_ADJACENCY_EXT: 10,
  GL_LINE_STRIP_ADJACENCY_EXT: 11,
  GL_TRIANGLES_ADJACENCY_EXT: 12,
  GL_TRIANGLE_STRIP_ADJACENCY_EXT: 13,
  GL_PROGRAM_POINT_SIZE_EXT: 34370,
  GL_MAX_VARYING_COMPONENTS_EXT: 35659,
  GL_MAX_GEOMETRY_TEXTURE_IMAGE_UNITS_EXT: 35881,
  GL_FRAMEBUFFER_ATTACHMENT_TEXTURE_LAYER_EXT: 36052,
  GL_FRAMEBUFFER_ATTACHMENT_LAYERED_EXT: 36263,
  GL_FRAMEBUFFER_INCOMPLETE_LAYER_TARGETS_EXT: 36264,
  GL_FRAMEBUFFER_INCOMPLETE_LAYER_COUNT_EXT: 36265,
  GL_GEOMETRY_SHADER_EXT: 36313,
  GL_GEOMETRY_VERTICES_OUT_EXT: 36314,
  GL_GEOMETRY_INPUT_TYPE_EXT: 36315,
  GL_GEOMETRY_OUTPUT_TYPE_EXT: 36316,
  GL_MAX_GEOMETRY_VARYING_COMPONENTS_EXT: 36317,
  GL_MAX_VERTEX_VARYING_COMPONENTS_EXT: 36318,
  GL_MAX_GEOMETRY_UNIFORM_COMPONENTS_EXT: 36318,
  GL_MAX_GEOMETRY_OUTPUT_VERTICES_EXT: 36320,
  GL_MAX_GEOMETRY_TOTAL_OUTPUT_COMPONENTS_EXT: 36321
};

/**
 * Struct to store the source code of a shader
 * @constructor
 * @param {string} code The source code of the shader.
 * @param {string} type The type of the shader.
 */
FABRIC.RT.ShaderSource = function(code, type) {
  this.code = (code !== undefined) ? code : '';
  this.type = (type !== undefined) ? type : 0;
};

FABRIC.appendOnCreateContextCallback(function(context) {
  context.RegisteredTypesManager.registerType('ShaderSource', {
      members: { code: 'String', type: 'Integer' },
      constructor: FABRIC.RT.ShaderSource
    });
});

/**
 * Struct to store information about a single shader's value
 * @constructor
 * @param {string} name The name of the shader's value.
 * @param {string} id The id of the shader's value.
 * @param {array} state The state of the shader's value.
 */
FABRIC.RT.ShaderValue = function(name, id, state) {
  this.name = (name !== undefined) ? name : '';
  this.id = (id !== undefined) ? id : 0;
  this.state = (state !== undefined) ? state : [];
  this.location = -1;
};

FABRIC.appendOnCreateContextCallback(function(context) {
  context.RegisteredTypesManager.registerType('ShaderValue', {
      members: { name: 'String', id: 'Integer', state: 'String[]', location: 'Integer' },
      constructor: FABRIC.RT.ShaderValue
    });
});

/**
 * Struct to store information about a single shader's program's parameter
 * @constructor
 * @param {string} id The id of the parameter.
 * @param {number} value The value of the parameter.
 */
FABRIC.RT.ShaderProgramParam = function(id, value) {
  this.id = (id !== undefined) ? id : 0;
  this.value = (value !== undefined) ? value : -1;
};

FABRIC.appendOnCreateContextCallback(function(context) {
  context.RegisteredTypesManager.registerType('ShaderProgramParam', {
      members: { id: 'Integer', value: 'Integer' },
      constructor: FABRIC.RT.ShaderProgramParam
    });
});

/**
 * Table storing all of the known shader attributes and their types.
 */
FABRIC.shaderAttributeTable = {
  indices: { id: 1, type: 'Integer[]' },
  positions: { id: 2, type: 'Vec3[]' },
  normals: { id: 3, type: 'Vec3[]' },
  tangents: { id: 4, type: 'Vec4[]' },
  vertexColors: { id: 5, type: 'Color[]' },

  uvs0: { id: 15, type: 'Vec2[]' },
  uvs1: { id: 16, type: 'Vec2[]' },
  uvs2: { id: 17, type: 'Vec2[]' },

  boneWeights: { id: 18, type: 'Mat33[]' },
  boneIds: { id: 19, type: 'Mat33[]' },

  color: { id: 30, type: 'Color' },
  ambientColor: { id: 31, type: 'Color' },
  diffuseColor: { id: 32, type: 'Color' },
  specularColor: { id: 33, type: 'Color' },
  shininess: { id: 34, type: 'Scalar' },
  bumpiness: { id: 35, type: 'Scalar' },

  light: { id: 50, type: 'Vec3' },
  lightType: { id: 51, type: 'Integer' },
  lightPosition: { id: 52, type: 'Vec3' },
  lightDir: { id: 53, type: 'Vec3' },
  lightColor: { id: 54, type: 'Color' },
  lightCosCutoff: { id: 55, type: 'Scalar' },
  lightShadowMap: { id: 56, type: 'Integer' },
  lightShadowMapMatrix: { id: 57, type: 'Mat44' },
  lightObjectMatrix: { id: 58, type: 'Mat44' },

  texture: { id: 80, type: 'Integer' },
  diffuseTexture: { id: 81, type: 'Integer' },
  specularTexture: { id: 82, type: 'Integer' },
  normalTexture: { id: 83, type: 'Integer' },
  spriteTexture: { id: 84, type: 'Integer' },
  fboTexture: { id: 85, type: 'Integer' },
  backgroundTexture: { id: 86, type: 'Integer' },

  boneMatrices: { id: 100, type: 'Mat44[]' },
  boneMatrixTexture: { id: 101, type: 'Integer' },

  modelMatrix: { id: 147, type: 'Mat44' },
  viewMatrix: { id: 146, type: 'Mat44' },
  normalMatrix: { id: 152, type: 'Mat33' },
  projectionMatrix: { id: 153, type: 'Mat44' },
  projectionMatrixInv: { id: 154, type: 'Mat44' },
  modelViewMatrix: { id: 148, type: 'Mat44' },
  modelViewProjectionMatrix: { id: 149, type: 'Mat44' },


  width: { id: 200, type: 'Integer' },
  height: { id: 201, type: 'Integer' },
  colorMix: { id: 202, type: 'Scalar' },
  blurSize: { id: 203, type: 'Scalar' }
};

FABRIC.SceneGraph.registerNodeType('Shader',
  function(options, scene) {
    scene.assignDefaults(options, {
        parentEventHandler: scene.getSceneRedrawEventHandler()
      });
    var shaderNode = scene.constructNode('SceneGraphNode', options),
      redrawEventHandler = scene.constructEventHandlerNode(options.name + '_draw'),
      shaderSources = [],
      uniformValues = [],
      programParams = [],
      i;

    if (options.fragmentShader) {
      shaderSources.push(new FABRIC.RT.ShaderSource(
        options.fragmentShader, FABRIC.SceneGraph.OpenGLConstants.GL_FRAGMENT_SHADER));
    }
    if (options.vertexShader) {
      shaderSources.push(new FABRIC.RT.ShaderSource(
        options.vertexShader, FABRIC.SceneGraph.OpenGLConstants.GL_VERTEX_SHADER));
    }
    if (options.geometryShader) {
      shaderSources.push(new FABRIC.RT.ShaderSource(
        options.geometryShader, FABRIC.SceneGraph.OpenGLConstants.GL_GEOMETRY_SHADER_EXT));
    }

    redrawEventHandler.setScopeName('shader');
    redrawEventHandler.addMember('shaderSources', 'ShaderSource[]', shaderSources);
    redrawEventHandler.addMember('name', 'String', options.name);
    redrawEventHandler.addMember('program', 'Integer', 0);

    ///////////////////////////////////////////////////
    // Uniform Values
    for (i in options.shaderUniforms) {
      if (!FABRIC.shaderAttributeTable[i]) {
        throw ('Error defining ' + options.name + '. Attribute not defined in the AttributeTable:' + i);
      }
      uniformValues.push(new FABRIC.RT.ShaderValue(
        options.shaderUniforms[i].name, FABRIC.shaderAttributeTable[i].id));
    }
    redrawEventHandler.addMember('uniformValues', 'ShaderValue[]', uniformValues);

    ///////////////////////////////////////////////////
    // Attribute Values
    var attributeValues = [];
    for (i in options.shaderAttributes) {
      if (!FABRIC.shaderAttributeTable[i]) {
        throw ('Attribute not defined in the AttributeTable:' + i);
      }
      attributeValues.push(new FABRIC.RT.ShaderValue(
        options.shaderAttributes[i].name, FABRIC.shaderAttributeTable[i].id));
    }
    redrawEventHandler.addMember('attributeValues', 'ShaderValue[]', attributeValues);

    ///////////////////////////////////////////////////
    // EXT Params
    for (i in options.programParams) {
      programParams.push(new FABRIC.RT.ShaderProgramParam(
        FABRIC.SceneGraph.OpenGLConstants[i], options.programParams[i]));
    }
    redrawEventHandler.addMember('programParams', 'ShaderProgramParam[]', programParams);

    redrawEventHandler.preDescendBindings.append(scene.constructOperator({
      operatorName: 'loadShader',
      srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/loadShader.kl',
      entryFunctionName: 'loadShader',
      parameterBinding: [
        'self.name',
        'self.shaderSources',
        'self.uniformValues',
        'self.attributeValues',
        'self.programParams',
        'self.program'
      ]
    }));

    if (options.parentEventHandler !== false) {
      // The shader is registered with the scenegraph, which will
      // handle passing render events to the shader from the cameras.
      options.parentEventHandler.appendChildEventHandler(redrawEventHandler);
    }

    shaderNode.getRedrawEventHandler = function() {
      return redrawEventHandler;
    };
    shaderNode.getVBORequirements = function() {
      return options.shaderAttributes;
    };
    return shaderNode;
  }
);



FABRIC.SceneGraph.registerNodeType('Material',
  function(options, scene) {
    scene.assignDefaults(options, {
        autoSetProgram: true,
        separateShaderNode: true
      });

    var materialNode,
      dgnode,
      redrawEventHandler,
      materialType = options.type,
      shaderPrefix,
      index,
      shaderName,
      shader,
      operators,
      addAccessors,
      uniform,
      uniformName,
      uniformType,
      operatorFunction,
      i,
      lightNodes = {},
      addLightInterface,
      textureNodes = {},
      addTextureInterface,
      textureUnit = 0;

    if (options.separateShaderNode) {
      shaderName = materialType + 'Shader' + (options.shaderNameDecoration !== undefined ?
                                              options.shaderNameDecoration : '');

      shader = scene.constructShaderNode(shaderName, {
        name: shaderName,
        fragmentShader: options.fragmentShader,
        vertexShader: options.vertexShader,
        geometryShader: options.geometryShader,
        shaderUniforms: options.shaderUniforms,
        shaderAttributes: options.shaderAttributes,
        programParams: options.programParams,
        parentEventHandler: options.parentEventHandler
      });

      options.dgnodenames.push('DGNode');
      materialNode = scene.constructNode('SceneGraphNode', options);
      dgnode = materialNode.getDGNode();
      redrawEventHandler = scene.constructEventHandlerNode(options.name + '_redraw');

      shader.getRedrawEventHandler().appendChildEventHandler(redrawEventHandler);

      materialNode.getShaderNode = function() {
        return shader;
      };
      materialNode.getRedrawEventHandler = function() {
        return redrawEventHandler;
      };
      materialNode.getVBORequirements = function() {
        return shader.getVBORequirements();
      };
    }
    else {
      // The shader and the material properties are stored in the same node.
      // we simply extend the shader with the material paramters. 
      options.dgnodenames.push('DGNode');
      materialNode = scene.constructNode('Shader', options);
      dgnode = materialNode.getDGNode();
      redrawEventHandler = materialNode.getRedrawEventHandler();
    }

    redrawEventHandler.addScope('material', dgnode);


    /////////////////////////////////
    // Material Binding operator
    scene.pushTimer('generatingMaterialOperators');

    operators = redrawEventHandler.preDescendBindings;
    if (options.autoSetProgram) {
      operators.append(scene.constructOperator({
        operatorName: 'useProgramOp',
        srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/loadShader.kl',
        entryFunctionName: 'useProgram',
        parameterBinding: [
          (options.separateShaderNode ? 'shader.program' : 'self.program')
        ]
      }));
    }

    /////////////////////////////////

    for (uniformName in options.shaderUniforms) {
      uniform = options.shaderUniforms[uniformName];
      // TODO: generalize a method for looking up uniform values from 'known owners'.
      if (uniform.owner !== undefined && uniform.owner !== 'window') {
        continue;
      }
      if (!FABRIC.shaderAttributeTable[uniformName]) {
        throw 'Error defining ' + materialType + '. Undefined shader attribute. ' +
          'Please add to the shader Attribute table:' + uniformName;
      }

      uniformType = FABRIC.shaderAttributeTable[uniformName].type;
      if (uniform.owner === undefined) {
        dgnode.addMember(uniformName, uniformType, uniform.defaultValue);
        materialNode.addMemberInterface(dgnode, uniformName, true);
      }
      operatorFunction = 'load' + uniformType + 'Uniform';
      operators.append(scene.constructOperator({
        operatorName: operatorFunction + uniformName,
        srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/loadUniforms.kl',
        preProcessorDefinitions: {
          ATTRIBUTE_ID: FABRIC.shaderAttributeTable[uniformName].id
        },
        entryFunctionName: operatorFunction,
        parameterBinding: [
          (options.separateShaderNode ? 'shader.uniformValues' : 'self.uniformValues'),
          (uniform.owner === undefined ? 'material' : uniform.owner) + '.' + uniformName
        ]
      }));
    }

    var capitalizeFirstLetter = function(str) {
      return str[0].toUpperCase() + str.substr(1);
    };

    if (options.lights) {
      addLightInterface = function(lightName, lightDef) {
        var lightStub, setterName, setLightNodeFn;
        lightStub = scene.constructEventHandlerNode(options.name + '_redraw_' + lightName);
        redrawEventHandler.appendChildEventHandler(lightStub);

        setLightNodeFn = function(node) {
          if (!node.isTypeOf(lightDef.type)) {
            throw ('Incorrect type assignment. Must assign a ' + lightDef.type);
          }
          node = scene.getPrivateInterface(node);
          lightNodes[lightName] = node;
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
      addTextureInterface = function(textureName, textureDef, textureUnit) {
        var textureStub = scene.constructEventHandlerNode(options.name + textureName + '_stub');
        textureStub.setScopeName('textureStub');
        textureStub.addMember('textureUnit', 'Integer', textureUnit);
        redrawEventHandler.appendChildEventHandler(textureStub);

        textureStub.preDescendBindings.append(scene.constructOperator({
          operatorName: 'loadIntegerUniform',
          srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/loadUniforms.kl',
          preProcessorDefinitions: {
            ATTRIBUTE_ID: FABRIC.shaderAttributeTable[textureName].id,
            ATTRIBUTE_NAME: textureName
          },
          entryFunctionName: 'loadIntegerUniform',
          parameterBinding: [
            'shader.uniformValues',
            'self.textureUnit'
          ]
        }));

        // Now add a method to assign the texture to the material
        var setTextureFn = function(node) {
          if (!node.isTypeOf('Texture')) {
            throw ('Incorrect type assignment. Must assign a Texture');
          }
          node = scene.getPrivateInterface(node);
          textureNodes[textureName] = node;
          textureStub.appendChildEventHandler(node.getRedrawEventHandler());
        };
        materialNode.pub['set' + capitalizeFirstLetter(textureName) + 'Node'] = setTextureFn;

        if (textureDef.node !== undefined) {
          setTextureFn(textureDef.node);
        }
      };
      for (i in options.textures) {
        addTextureInterface(i, options.textures[i], textureUnit);
        textureUnit++;
      }
    }

    scene.popTimer('generatingMaterialOperators');
    return materialNode;
  });


FABRIC.SceneGraph.registerNodeType('ShadowmapMaterial',
  function(options, scene) {
    options.parentEventHandler = scene.getBeginRenderShadowMapEventHandler();
    return scene.constructNode('Material', options);
  });

FABRIC.SceneGraph.registerNodeType('PointMaterial',
  function(options, scene) {
    scene.assignDefaults(options, {
        pointSize: 3.0
      });

    var pointMaterial = scene.constructNode('Material', options);
    var dgnode = pointMaterial.getDGNode();
    dgnode.addMember('pointSize', 'Scalar', options.pointSize);
    pointMaterial.addMemberInterface(dgnode, 'pointSize', true);

    // Note: this method of setting the point size is probably obsolete.
    // TODO: Define a new effect and use material uniforms.
    pointMaterial.getRedrawEventHandler().preDescendBindings.append(scene.constructOperator({
        operatorName: 'setPointSize',
        srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/drawPoints.kl',
        entryFunctionName: 'setPointSize',
        parameterBinding: ['material.pointSize']
      }));
    return pointMaterial;
  });


FABRIC.SceneGraph.registerNodeType('PostProcessEffect',
  function(options, scene) {
    scene.assignDefaults(options, {
        fragmentShader: undefined,
        shaderUniforms: undefined
      });

    options.autoSetProgram = false;
    options.parentEventHandler = false;
    options.separateShaderNode = false;

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
    redrawEventHandler.addMember('offscreenFBO', 'Integer', 0);
    redrawEventHandler.addMember('offscreenPrevFBO', 'Integer', 0);
    redrawEventHandler.addMember('offscreenColorID', 'Integer', 0);
    redrawEventHandler.addMember('offscreenDepthID', 'Integer', 0);

    redrawEventHandler.preDescendBindings.append(
      scene.constructOperator({
          operatorName: 'prepareOffscreenRenderingOp',
          srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/OffscreenRendering.kl',
          entryFunctionName: 'prepareOffscreenRendering',
          parameterBinding: [
            'window.width',
            'window.height',
            'self.offscreenFBO',
            'self.offscreenPrevFBO',
            'self.offscreenColorID',
            'self.offscreenDepthID'
          ]
        }
     ));

    redrawEventHandler.postDescendBindings.append(
      scene.constructOperator({
          operatorName: 'renderOffscreenToViewOp',
          srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/OffscreenRendering.kl',
          entryFunctionName: 'renderOffscreenToView',
          parameterBinding: [
            'window.width',
            'window.height',
            'self.offscreenPrevFBO',
            'self.offscreenColorID',
            'self.program'
          ]
        }
     ));
    return postProcessEffect;
  }
);

/**
 * Function to create an effect based on an
 * effect xml file.
 * @param {string} effectfile The path to the xml file.
 */
FABRIC.SceneGraph.defineEffectFromFile = function(effectfile) {

  var xmlText,
    parser,
    xmlDoc,
    xmlRoot,
    effectFilePathArray,
    effectFilePath,
    preprocessorDirectives = {},
    effectParameters = {},
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
      if (uniformNode.getAttribute('defaultValue')) {
        effectParameters.shaderUniforms[uniformName].defaultValue = eval(uniformNode.getAttribute('defaultValue'));
      }
      if (uniformNode.getAttribute('owner')) {
        effectParameters.shaderUniforms[uniformName].owner = uniformNode.getAttribute('owner');
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
    var len, j, textureNode;
    effectParameters.textures = {};
    len = node.childNodes.length;
    for (j = 0; j < len; j++) {
      if (node.childNodes[j].nodeName === '#text') {
        continue;
      }
      textureNode = node.childNodes[j];
      effectParameters.textures[textureNode.getAttribute('binding')] = {
        name: textureNode.getAttribute('binding')
      };
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
        source = source + FABRIC.loadResourceURL(
          effectFilePath + node.childNodes[j].getAttribute('file'), 'text/plain');
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
      case 'preprocessordirectives':
        collectPreprocessorDirectives(childNode);
        break;
      case 'vertexshader':
        effectParameters.vertexShader = collectShaderSource(childNode);
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

  FABRIC.SceneGraph.registerNodeType(effectParameters.name,
    function(options, scene) {
      scene.pushTimer('constructMaterialAndShaderNode');
      scene.assignDefaults(options, {
          prototypeMaterialType: 'Material'
        });
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

      materialNode = scene.constructNode(options.prototypeMaterialType, effectInstanceParameters);
      
      var capitalizeFirstLetter = function(str) {
        return str[0].toUpperCase() + str.substr(1);
      };
      for (uniformName in effectParameters.shaderUniforms) {
        if (options[uniformName] !== undefined) {
          materialNode.pub[uniformName] = options[uniformName];
        }
      }
      for (lightName in effectParameters.lights) {
        if (options[lightName + 'Node']) {
          materialNode.pub['set' + capitalizeFirstLetter(lightName) + 'Node'](options[lightName + 'Node']);
        }
      }
      for (textureName in effectParameters.textures) {
        if (options[textureName + 'Node']) {
          materialNode.pub['set' + capitalizeFirstLetter(textureName) + 'Node'](options[textureName + 'Node']);
        }
      }

      scene.popTimer('constructMaterialAndShaderNode');
      return materialNode;
    });
};

FABRIC.SceneGraph.defineEffectFromFile('FABRIC_ROOT/SceneGraph/Resources/Shaders/FlatShader.xml');
FABRIC.SceneGraph.defineEffectFromFile('FABRIC_ROOT/SceneGraph/Resources/Shaders/FlatScreenSpaceShader.xml');
FABRIC.SceneGraph.defineEffectFromFile('FABRIC_ROOT/SceneGraph/Resources/Shaders/PhongShader.xml');
FABRIC.SceneGraph.defineEffectFromFile('FABRIC_ROOT/SceneGraph/Resources/Shaders/ShadowMapShader.xml');

FABRIC.SceneGraph.defineEffectFromFile('FABRIC_ROOT/SceneGraph/Resources/Shaders/NormalShader.xml');
FABRIC.SceneGraph.defineEffectFromFile('FABRIC_ROOT/SceneGraph/Resources/Shaders/FlatTextureShader.xml');
FABRIC.SceneGraph.defineEffectFromFile('FABRIC_ROOT/SceneGraph/Resources/Shaders/PhongTextureShader.xml');
FABRIC.SceneGraph.defineEffectFromFile('FABRIC_ROOT/SceneGraph/Resources/Shaders/PhongBumpReflectShader.xml');
FABRIC.SceneGraph.defineEffectFromFile('FABRIC_ROOT/SceneGraph/Resources/Shaders/PhongSkinningShader.xml');

FABRIC.SceneGraph.defineEffectFromFile('FABRIC_ROOT/SceneGraph/Resources/Shaders/ShadowReceivingPhongShader.xml');
FABRIC.SceneGraph.defineEffectFromFile('FABRIC_ROOT/SceneGraph/Resources/Shaders/PhongBumpReflectSkinningShader.xml');

FABRIC.SceneGraph.defineEffectFromFile('FABRIC_ROOT/SceneGraph/Resources/Shaders/VertexColorShader.xml');
FABRIC.SceneGraph.defineEffectFromFile('FABRIC_ROOT/SceneGraph/Resources/Shaders/PhongVertexColorShader.xml');



FABRIC.SceneGraph.registerNodeType('PointSpriteMaterial',
  function(options, scene) {

    scene.assignDefaults(options, {
        pointSize: 5
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
      positions: { name: 'a_position' },
      vertexColors: { name: 'a_color' }
    };
    options.textures = {
      spriteTexture: { node: pointSpriteTextureNode.pub }
    };
    options.vertexShader = FABRIC.loadResourceURL('FABRIC_ROOT/SceneGraph/Resources/Shaders/PointSpriteVertexShader.glsl');
    options.fragmentShader = FABRIC.loadResourceURL('FABRIC_ROOT/SceneGraph/Resources/Shaders/PointSpriteFragmentShader.glsl');

    var pointSpriteMaterialNode = scene.constructNode('Material', options);
    var dgnode = pointSpriteMaterialNode.getDGNode();

    dgnode.addMember('pointSize', 'Scalar', options.pointSize);
    pointSpriteMaterialNode.addMemberInterface(dgnode, 'pointSize', true);
    
    pointSpriteMaterialNode.getRedrawEventHandler().preDescendBindings.append(scene.constructOperator({
        operatorName: 'preDrawSpritePoints',
        srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/drawPoints.kl',
        entryFunctionName: 'preDrawSpritePoints',
        parameterBinding: ['material.pointSize']
      }));
    pointSpriteMaterialNode.getRedrawEventHandler().postDescendBindings.append(scene.constructOperator({
        operatorName: 'postDrawSpritePoints',
        srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/drawPoints.kl',
        entryFunctionName: 'postDrawSpritePoints',
        parameterBinding: []
      }));

    return pointSpriteMaterialNode;
  });


FABRIC.SceneGraph.registerNodeType('StupidPostProcessEffect',
  function(options, scene) {
    options.fragmentShader =
      'uniform sampler2D u_rgbaImage;' +
      'void main()' +
      '{' +
      '  vec2 uv = gl_TexCoord[0].st;' +
      '  uv.s += sin(gl_FragCoord.x) * 0.01;' +
      '  uv.t += cos(gl_FragCoord.x) * 0.01;' +
      '  gl_FragColor = texture2D(u_rgbaImage, uv);' +
      '}';
    var stupidPostProcessEffect = scene.constructNode('PostProcessEffect', options);
    return stupidPostProcessEffect;
  });


FABRIC.SceneGraph.registerNodeType('BloomPostProcessEffect',
  function(options, scene) {
    options.fragmentShader = FABRIC.loadResourceURL('FABRIC_ROOT/SceneGraph/Resources/Shaders/BloomPixelShader.glsl');

    var bloomPostProcessEffect = scene.constructNode('PostProcessEffect', options);
    return bloomPostProcessEffect;
  });


FABRIC.SceneGraph.registerNodeType('FilmicTonemapperPostProcessEffect',
  function(options, scene) {
    options.fragmentShader = FABRIC.loadResourceURL('FABRIC_ROOT/SceneGraph/Resources/Shaders/FilmicTonemapper.glsl');

    var filmicTonemapperEffect = scene.constructNode('PostProcessEffect', options);
    return filmicTonemapperEffect;
  });


FABRIC.SceneGraph.registerNodeType('EdgeDetectionPostProcessEffect',
  function(options, scene) {
    options.fragmentShader = FABRIC.loadResourceURL('FABRIC_ROOT/SceneGraph/Resources/Shaders/EdgeDetectionPixelShader.glsl');

    options.shaderUniforms = {
      width: { name: 'u_width', owner: 'window' },
      height: { name: 'u_height', owner: 'window' },
      colorMix: { name: 'u_colorMix' }
    };

    var edgeDetectionEffect = scene.constructNode('PostProcessEffect', options);
    return edgeDetectionEffect;
  });



FABRIC.SceneGraph.registerNodeType('GaussianBlurPostProcessEffect',
  function(options, scene) {
    options.fragmentShader = FABRIC.loadResourceURL('FABRIC_ROOT/SceneGraph/Resources/Shaders/GaussianBlurFragmentShader.glsl');

    options.shaderUniforms = {
      blurSize: { name: 'u_blurSize', defaultValue: 1.0 / 512.0 }
    };

    var edgeDetectionEffect = scene.constructNode('PostProcessEffect', options);
    return edgeDetectionEffect;
  });


