
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//
/**
 * Constructor function to create a Ray object.
 * @constructor
 * @param {object} start A Vec3 defining the start of the ray.
 * @param {object} direction A Vec3 defining the direction of the ray.
 */
FABRIC.RT.RenderTargetTextureDesc = function(type, format) {
  this.type = type ? type : 0;
  this.format = format ? format : 0;
  this.id = 0;
};

FABRIC.appendOnCreateContextCallback(function(context) {
  context.RegisteredTypesManager.registerType('RenderTargetTextureDesc', {
    members: {
      type: 'Size', format: 'Size', id: 'Size'
    },
    constructor: FABRIC.RT.RenderTargetTextureDesc
  });
});


/**
 * Constructor function to create a Ray object.
 * @constructor
 * @param {object} start A Vec3 defining the start of the ray.
 * @param {object} direction A Vec3 defining the direction of the ray.
 */
FABRIC.RT.RenderTarget = function(width, height, textureDescs) {
  this.width = width ? width : 0;
  this.height = height ? height : 0;
  this.textureDescs = textureDescs ? textureDescs : [];
  this.fbo = 0;
  this.depthBuffer = -1;
  this.hasDepthBufferTexture = false;
  this.numColorBuffers = 0;
  this.clearDepth = true;
  this.clearColor = true;
};

FABRIC.appendOnCreateContextCallback(function(context) {
  context.RegisteredTypesManager.registerType('RenderTarget', {
    members: {
      textureDescs: 'RenderTargetTextureDesc[]',
      width: 'Size',
      height: 'Size',
      fbo: 'Size',
      depthBuffer: 'Integer',
      hasDepthBufferTexture: 'Boolean',
      numColorBuffers: 'Integer',
      clearDepth: 'Boolean',
      clearColor: 'Boolean'
    },
    constructor: FABRIC.RT.RenderTarget,
    kBindings: FABRIC.loadResourceURL('FABRIC_ROOT/SceneGraph/Resources/RT/RenderTarget.kl')
  });
});

