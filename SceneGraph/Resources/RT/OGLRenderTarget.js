
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
  this.texture = texture ? texture : 0;
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
FABRIC.RT.OGLRenderTarget = function(width, height, textures) {
  this.width = width ? width : 0;
  this.height = height ? height : 0;
  this.textures = textures ? textures : [];
  this.fbo = 0;
  this.depthBuffer = -1;
  this.hasDepthBufferTexture = false;
  this.numColorBuffers = 0;
  this.clearDepth = true;
  this.clearColor = FABRIC.RT.rgb();
  this.clearColorFlag = true;
  // Here we define some constants that are used to define the type
  // of buffer. We need a way of defining constants in KL.
  this.DEPTH_BUFFER = 0;
  this.COLOR_BUFFER = 1;
};

FABRIC.appendOnCreateContextCallback(function(context) {
  context.RegisteredTypesManager.registerType('RenderTarget', {
    members: {
      textures: 'OGLTexture2D[]',
      width: 'Size',
      height: 'Size',
      fbo: 'Size',
      depthBuffer: 'Integer',
      hasDepthBufferTexture: 'Boolean',
      numColorBuffers: 'Integer',
      clearDepth: 'Boolean',
      clearColor: 'Boolean'
    },
    constructor: FABRIC.RT.OGLRenderTarget,
    kBindings: FABRIC.loadResourceURL('FABRIC_ROOT/SceneGraph/Resources/RT/OGLRenderTarget.kl')
  });
});

