
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//

/**
 * Constructor function to create a Ray object.
 * @constructor
 * @param {object} start A Vec3 defining the start of the ray.
 * @param {object} direction A Vec3 defining the direction of the ray.
 */
FABRIC.RT.OGLRenderTargetTextureDesc = function(type, texture) {
  this.type = type ? type : 0;
  this.texture = texture ? texture : new FABRIC.RT.OGLTexture2D();
};

FABRIC.appendOnCreateContextCallback(function(context) {
  context.RegisteredTypesManager.registerType('OGLRenderTargetTextureDesc', {
    members: {
      type: 'Size', texture: 'OGLTexture2D'
    },
    constructor: FABRIC.RT.OGLRenderTargetTextureDesc
  });
});

 

/**
 * Constructor function to create a OGLRenderTarget object.
 * @constructor
 * @param {width} start A Vec3 defining the start of the ray.
 * @param {height} direction A Vec3 defining the direction of the ray.
 */
FABRIC.RT.OGLRenderTarget = function(width, height, textures, options) {
  this.width = width ? width : 0;
  this.height = height ? height : 0;
  this.textures = textures ? textures : [];
  this.fbo = 0;
  this.prevFbo = 0;
  this.depthBuffer = -1;
  this.hasDepthBufferTexture = false;
  this.numColorBuffers = 0;
  this.clearDepth = true;
  this.clearColorFlag = true;
  this.clearColor = (options && options.clearColor) ? options.clearColor : FABRIC.RT.rgba();
  this.enableOptions = (options && options.enableOptions) ? options.enableOptions : [];
  this.cullFace = (options && options.cullFace) ? options.cullFace : 0;
  // Here we define some constants that are used to define the type
  // of buffer. We need a way of defining constants in KL.
  this.DEPTH_BUFFER = 1;
  this.COLOR_BUFFER = 2;
};

FABRIC.appendOnCreateContextCallback(function(context) {
  context.RegisteredTypesManager.registerType('OGLRenderTarget', {
    members: {
      width: 'Size',
      height: 'Size',
      textures: 'OGLRenderTargetTextureDesc[]',
      fbo: 'Size',
      prevFbo: 'Size',
      depthBuffer: 'Integer',
      hasDepthBufferTexture: 'Boolean',
      numColorBuffers: 'Integer',
      clearDepth: 'Boolean',
      clearColorFlag: 'Boolean',
      clearColor: 'Color',
      enableOptions: 'Size[]',
      cullFace: 'Size'
    },
    constructor: FABRIC.RT.OGLRenderTarget,
    kBindings: FABRIC.loadResourceURL('FABRIC_ROOT/SceneGraph/Resources/RT/OGLRenderTarget.kl')
  });
});

FABRIC.RT.oglDepthRenderTarget = function(size){
  return new FABRIC.RT.OGLRenderTarget(
    size,
    size,
    [
      new FABRIC.RT.OGLRenderTargetTextureDesc(
        1,
        new FABRIC.RT.OGLTexture2D(
          FABRIC.SceneGraph.OpenGLConstants.GL_DEPTH_COMPONENT,
          FABRIC.SceneGraph.OpenGLConstants.GL_DEPTH_COMPONENT,
          FABRIC.SceneGraph.OpenGLConstants.GL_FLOAT)
      ),
      new FABRIC.RT.OGLRenderTargetTextureDesc(
        2,
        new FABRIC.RT.OGLTexture2D(
          FABRIC.SceneGraph.OpenGLConstants.GL_RGBA8,
          FABRIC.SceneGraph.OpenGLConstants.GL_RGBA,
          FABRIC.SceneGraph.OpenGLConstants.GL_UNSIGNED_BYTE)
      )
    ],
    {
      enableOptions:[FABRIC.SceneGraph.OpenGLConstants.GL_DEPTH_TEST,
                     FABRIC.SceneGraph.OpenGLConstants.GL_CULL_FACE],
      cullFace:FABRIC.SceneGraph.OpenGLConstants.GL_FRONT
    }
  )
}

