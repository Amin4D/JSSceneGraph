
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
  this.glInternalFormat = glInternalFormat ? glInternalFormat : 0;
  this.glFormat = glFormat ? glFormat : 0;
  this.glType = glType ? glType : 0;
  this.bufferID = 0;
  this.nbPixels = 0;
  this.textureMinFilter = FABRIC.SceneGraph.OpenGLConstants ? FABRIC.SceneGraph.OpenGLConstants.GL_LINEAR : 0;
  this.textureMaxFilter = FABRIC.SceneGraph.OpenGLConstants ? FABRIC.SceneGraph.OpenGLConstants.GL_LINEAR : 0;
  this.wrapS = FABRIC.SceneGraph.OpenGLConstants ? FABRIC.SceneGraph.OpenGLConstants.GL_REPEAT : 0;
  this.wrapT = FABRIC.SceneGraph.OpenGLConstants ? FABRIC.SceneGraph.OpenGLConstants.GL_REPEAT : 0;
  this.forceRefresh = false;
};

FABRIC.RT.oglTexture2D = function(){
  return new FABRIC.RT.OGLTexture2D(
    FABRIC.SceneGraph.OpenGLConstants.GL_RGBA8,
    FABRIC.SceneGraph.OpenGLConstants.GL_RGBA,
    FABRIC.SceneGraph.OpenGLConstants.GL_UNSIGNED_BYTE);
}

FABRIC.RT.oglMatrixBuffer2D = function(){
  var oglTexture = new FABRIC.RT.OGLTexture2D();
  oglTexture.glInternalFormat = FABRIC.SceneGraph.OpenGLConstants.GL_RGBA32F;
  oglTexture.glFormat = FABRIC.SceneGraph.OpenGLConstants.GL_RGBA;
  oglTexture.glType = FABRIC.SceneGraph.OpenGLConstants.GL_FLOAT;
  oglTexture.forceRefresh = true;
  oglTexture.textureMinFilter = FABRIC.SceneGraph.OpenGLConstants.GL_NEAREST;
  oglTexture.textureMaxFilter = FABRIC.SceneGraph.OpenGLConstants.GL_NEAREST;
  oglTexture.wrapS = FABRIC.SceneGraph.OpenGLConstants.GL_CLAMP_TO_EDGE;
  oglTexture.wrapT = FABRIC.SceneGraph.OpenGLConstants.GL_CLAMP_TO_EDGE;
  return oglTexture;
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
     glInternalFormat: 'Size',
     glFormat: 'Size',
     glType: 'Size',
     bufferID: 'Size',
     nbPixels: 'Size',
     textureMinFilter: 'Integer',
     textureMaxFilter: 'Integer',
     wrapS: 'Integer',
     wrapT: 'Integer',
     forceRefresh: 'Boolean'
    },
    constructor: FABRIC.RT.OGLTexture2D,
    klBindings: {
      filename: 'OGLTexture2D.kl',
      sourceCode: FABRIC.loadResourceURL('FABRIC_ROOT/SceneGraph/RT/OGLTexture2D.kl')
    }
  });
});


