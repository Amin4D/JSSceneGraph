
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//
/**
 * Constructor function to create a Ray object.
 * @constructor
 * @param {object} start A Vec3 defining the start of the ray.
 * @param {object} direction A Vec3 defining the direction of the ray.
 */
FABRIC.RT.OGLTextureCube = function(textures) {
  this.size = 0;
  this.bufferID = 0;
  this.textureData = [];
  this.textureDataSize = [];
};

FABRIC.RT.oglTextureCube = function(textures){
  return new FABRIC.RT.OGLTextureCube(textures);
}

FABRIC.appendOnCreateContextCallback(function(context) {
  context.RegisteredTypesManager.registerType('OGLTextureCube', {
    members: {
      size: 'Size',
      bufferID: 'Size',
      textureData: 'Data[]',
      textureDataSize: 'Size[]'
    },
    constructor: FABRIC.RT.OGLTextureCube,
    kBindings: FABRIC.loadResourceURL('FABRIC_ROOT/SceneGraph/Resources/RT/OGLTextureCube.kl')
  });
});


