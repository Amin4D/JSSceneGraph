
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//
/**
 * Constructor function to create a Ray object.
 * @constructor
 * @param {object} start A Vec3 defining the start of the ray.
 * @param {object} direction A Vec3 defining the direction of the ray.
 */
FABRIC.RT.OGLTextureCube = function(glInternalFormat, glFormat, glType) {
  this.glInternalFormat = glInternalFormat ? glInternalFormat : 0;
  this.glFormat = glFormat ? glFormat : 0;
  this.glType = glType ? glType : 0;
  
  this.size = 0;
  this.bufferID = 0;
  this.textureData = [];
  this.textureDataSize = [];
};

FABRIC.RT.cubeMapLDR = function(){
  return new FABRIC.RT.OGLTextureCube(
    FABRIC.SceneGraph.OpenGLConstants.GL_RGBA8,
    FABRIC.SceneGraph.OpenGLConstants.GL_RGBA,
    FABRIC.SceneGraph.OpenGLConstants.GL_UNSIGNED_BYTE);
}


FABRIC.appendOnCreateContextCallback(function(context) {
  context.RegisteredTypesManager.registerType('OGLTextureCube', {
    members: {
      glInternalFormat: 'Size',
      glFormat: 'Size',
      glType: 'Size',
      size: 'Size',
      bufferID: 'Size',
      textureData: 'RGBA[][]',
      textureDataSize: 'Size[]'
    },
    constructor: FABRIC.RT.OGLTextureCube,
    kBindings: FABRIC.loadResourceURL('FABRIC_ROOT/SceneGraph/RT/OGLTextureCube.kl')
  });
});


