
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//




/**
 * Struct to store information about a single shader's value
 * @constructor
 * @param {string} name The name of the shader's value.
 * @param {string} id The id of the shader's value.
 * @param {array} state The state of the shader's value.
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
    kBindings: FABRIC.loadResourceURL('FABRIC_ROOT/SceneGraph/Resources/RT/OGLBuffer.kl')
  });
});



