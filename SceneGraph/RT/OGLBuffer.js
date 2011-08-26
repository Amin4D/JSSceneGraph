
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//




/**
 * Struct to store information about an opernGL buffer (VBO)
 * @constructor
 * @param {string} name The name of the VBO
 * @param {string} id The id of the VBO.
 * @param {string} dataType The state of the shader's value.
 */
FABRIC.RT.OGLBuffer = function(name, id, dataType, dynamic) {
  this.name = (name !== undefined) ? name : '';
  this.attributeID = (id !== undefined) ? id : 0;
  this.bufferID = 0;
  this.dynamic = (dynamic !== undefined) ? dynamic : false;
  this.reload = false;
  this.elementCount = 0;
  this.elementDataSize = dataType ? dataType.size : 0;
  this.numBufferElementComponents = this.elementDataSize/4; // TODO: review this member.
  if(this.numBufferElementComponents > 4){
    // We are currenlty storing vertex weights and bone indices for defomation
    // in mat33 values. While it seems to work, openGL buffers are only supposed
    // to be able to store up to 16 bytes per vertex. Interestingly its been working
    // on all GPUs. Note: We should probably split the vertex bones weights/indices
    //  into 2 vec4s instead of one mat33.
    this.numBufferElementComponents = 3;
  }
  this.bufferType = FABRIC.SceneGraph.OpenGLConstants ? FABRIC.SceneGraph.OpenGLConstants.GL_STATIC_DRAW : 0;
  this.bufferElementComponentType = FABRIC.SceneGraph.OpenGLConstants ? FABRIC.SceneGraph.OpenGLConstants.GL_FLOAT : 0;
};


FABRIC.appendOnCreateContextCallback(function(context) {
  context.RegisteredTypesManager.registerType('OGLBuffer', {
    members: {
      name: 'String',
      attributeID: 'Integer',
      bufferID: 'Integer',
      dynamic: 'Boolean',
      reload: 'Boolean',
      elementCount: 'Integer',
      elementDataSize: 'Integer',
      numBufferElementComponents: 'Integer',
      bufferType: 'Integer',
      bufferElementComponentType: 'Integer'
    },
    constructor: FABRIC.RT.OGLBuffer,
    kBindings: FABRIC.loadResourceURL('FABRIC_ROOT/SceneGraph/RT/OGLBuffer.kl')
  });
});



