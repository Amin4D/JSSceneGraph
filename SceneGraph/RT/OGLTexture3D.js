
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//
FABRIC.RT.OGLTexture3D = function(glInternalFormat, glFormat, glType) {
  this.glInternalFormat = glInternalFormat ? glInternalFormat : 0;
  this.glFormat = glFormat ? glFormat : 0;
  this.glType = glType ? glType : 0;
  this.bufferID = 0;
  this.nbPixels = 0;
  this.textureMinFilter = FABRIC.SceneGraph.OpenGLConstants ? FABRIC.SceneGraph.OpenGLConstants.GL_LINEAR : 0;
  this.textureMaxFilter = FABRIC.SceneGraph.OpenGLConstants ? FABRIC.SceneGraph.OpenGLConstants.GL_LINEAR : 0;
  this.wrapS = FABRIC.SceneGraph.OpenGLConstants ? FABRIC.SceneGraph.OpenGLConstants.GL_REPEAT : 0;
  this.wrapT = FABRIC.SceneGraph.OpenGLConstants ? FABRIC.SceneGraph.OpenGLConstants.GL_REPEAT : 0;
  this.wrapR = FABRIC.SceneGraph.OpenGLConstants ? FABRIC.SceneGraph.OpenGLConstants.GL_REPEAT : 0;
  this.forceRefresh = false;
};

FABRIC.RT.oglTexture3D_RGBA = function(){
  return new FABRIC.RT.OGLTexture3D(
    FABRIC.SceneGraph.OpenGLConstants.GL_RGBA8,
    FABRIC.SceneGraph.OpenGLConstants.GL_RGBA,
    FABRIC.SceneGraph.OpenGLConstants.GL_UNSIGNED_BYTE);
}

FABRIC.RT.oglTexture3D_Byte = function(){
  return new FABRIC.RT.OGLTexture3D(
    FABRIC.SceneGraph.OpenGLConstants.GL_INTENSITY8,
    FABRIC.SceneGraph.OpenGLConstants.GL_LUMINANCE,
    FABRIC.SceneGraph.OpenGLConstants.GL_UNSIGNED_BYTE);
}

FABRIC.RT.oglTexture3D_Color = function(){
  return new FABRIC.RT.OGLTexture3D(
    FABRIC.SceneGraph.OpenGLConstants.GL_RGBA32F,
    FABRIC.SceneGraph.OpenGLConstants.GL_RGBA,
    FABRIC.SceneGraph.OpenGLConstants.GL_FLOAT);
}

FABRIC.RT.oglTexture3D_Scalar = function(){
  return new FABRIC.RT.OGLTexture3D(
    FABRIC.SceneGraph.OpenGLConstants.GL_INTENSITY32F_ARB,
    FABRIC.SceneGraph.OpenGLConstants.GL_LUMINANCE,
    FABRIC.SceneGraph.OpenGLConstants.GL_FLOAT);
}
        
FABRIC.appendOnCreateContextCallback(function(context) {
  context.RegisteredTypesManager.registerType('OGLTexture3D', {
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
     wrapR: 'Integer',
     forceRefresh: 'Boolean'
    },
    constructor: FABRIC.RT.OGLTexture3D,
    klBindings: {
      filename: 'OGLTexture3D.kl',
      sourceCode: FABRIC.loadResourceURL('FABRIC_ROOT/SceneGraph/RT/OGLTexture3D.kl')
    }
  });
});


