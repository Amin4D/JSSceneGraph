
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
  this.numBufferElementComponents = this.elementDataSize/4;
  this.bufferType = FABRIC.SceneGraph.OpenGLConstants ? FABRIC.SceneGraph.OpenGLConstants.GL_ARRAY_BUFFER : 0;
  this.bufferUsage = FABRIC.SceneGraph.OpenGLConstants ? FABRIC.SceneGraph.OpenGLConstants.GL_STATIC_DRAW : 0;
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
      bufferUsage: 'Integer',
      bufferElementComponentType: 'Integer'
    },
    constructor: FABRIC.RT.OGLBuffer,
    kBindings: FABRIC.loadResourceURL('FABRIC_ROOT/SceneGraph/RT/OGLBuffer.kl')
  });
});




/**
 * Struct to store information about an opernGL buffer (VBO)
 * @constructor
 * @param {string} name The name of the VBO
 * @param {string} id The id of the VBO.
 * @param {string} dataType The state of the shader's value.
 */
/* A single set of indices can be used to generate multiple buffers. */
/* e.g. a set of indices for triangles can be usded to generate adjacency lists. */
FABRIC.RT.OGLIndicesBuffer = function(name, id, dataType, dynamic) {
  this.name = (name !== undefined) ? name : '';
  this.attributeID = (id !== undefined) ? id : 0;
  this.bufferIDs = []; 
  this.reload = false;
  this.elementCount = 0;
};


FABRIC.appendOnCreateContextCallback(function(context) {
  context.RegisteredTypesManager.registerType('OGLIndicesBuffer', {
    members: {
      attributeID: 'Integer',
      bufferIDs: 'Integer[]',
      reload: 'Boolean',
      elementCount: 'Integer'
    },
    constructor: FABRIC.RT.OGLIndicesBuffer,
    kBindings: FABRIC.loadResourceURL('FABRIC_ROOT/SceneGraph/RT/OGLIndicesBuffer.kl')
  });
});


