
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//
/**
 * Constructor function to create a Ray object.
 * @constructor
 * @param {object} start A Vec3 defining the start of the ray.
 * @param {object} direction A Vec3 defining the direction of the ray.
 */
FABRIC.RT.OGLTexture2D = function(glInternalFormat, glFormat, glType) {
  this.glInternalFormat = glInternalFormat ? glInternalFormat : 0;//FABRIC.SceneGraph.OpenGLConstants.GL_RGBA8;
  this.glFormat = glFormat ? glFormat : 0;//FABRIC.SceneGraph.OpenGLConstants.GL_RGBA;
  this.glType = glType ? glType : 0;//FABRIC.SceneGraph.OpenGLConstants.GL_UNSIGNED_BYTE;
  this.bufferID = 0;
  this.nbPixels = 0;
};

FABRIC.RT.oglTexture2D = function(){
  return new FABRIC.RT.OGLTexture2D(
    FABRIC.SceneGraph.OpenGLConstants.GL_RGBA8,
    FABRIC.SceneGraph.OpenGLConstants.GL_RGBA,
    FABRIC.SceneGraph.OpenGLConstants.GL_UNSIGNED_BYTE);
}

FABRIC.RT.oglDepthBuffer2D = function(){
  return new FABRIC.RT.OGLTexture2D(
    FABRIC.SceneGraph.OpenGLConstants.GL_DEPTH_COMPONENT,
    FABRIC.SceneGraph.OpenGLConstants.GL_DEPTH_COMPONENT,
    FABRIC.SceneGraph.OpenGLConstants.GL_FLOAT);
}

        
FABRIC.appendOnCreateContextCallback(function(context) {
  context.RegisteredTypesManager.registerType('OGLTexture2D', {
    members: {
     glInternalFormat: 'Size', glFormat: 'Size', glType: 'Size', bufferID: 'Size', nbPixels: 'Size'
    },
    constructor: FABRIC.RT.OGLTexture2D,
    kBindings: FABRIC.loadResourceURL('FABRIC_ROOT/SceneGraph/Resources/RT/OGLTexture2D.kl')
  });
});


