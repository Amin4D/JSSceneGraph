
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//


/**
 * Struct to store the source code of a shader
 * @constructor
 * @param {string} code The source code of the shader.
 * @param {string} type The type of the shader.
 */
FABRIC.RT.OGLShaderSource = function(code, type) {
  this.code = (code !== undefined) ? code : '';
  this.type = (type !== undefined) ? type : 0;
};

FABRIC.appendOnCreateContextCallback(function(context) {
  context.RegisteredTypesManager.registerType('OGLShaderSource', {
      members: { code: 'String', type: 'Integer' },
      constructor: FABRIC.RT.OGLShaderSource
    });
});

/**
 * Struct to store information about a single shader's value
 * @constructor
 * @param {string} name The name of the shader's value.
 * @param {string} id The id of the shader's value.
 * @param {array} state The state of the shader's value.
 */
FABRIC.RT.OGLShaderValue = function(name, id) {
  this.name = (name !== undefined) ? name : '';
  this.id = (id !== undefined) ? id : 0;
  this.location = -1;
};

FABRIC.appendOnCreateContextCallback(function(context) {
  context.RegisteredTypesManager.registerType('OGLShaderValue', {
      members: { name: 'String', id: 'Integer', location: 'Integer' },
      constructor: FABRIC.RT.OGLShaderValue
    });
});


/**
 * Struct to store information about a single shader's program's parameter
 * @constructor
 * @param {string} id The id of the parameter.
 * @param {number} value The value of the parameter.
 */
FABRIC.RT.OGLShaderProgramParam = function(id, value) {
  this.id = (id !== undefined) ? id : 0;
  this.value = (value !== undefined) ? value : -1;
};

FABRIC.appendOnCreateContextCallback(function(context) {
  context.RegisteredTypesManager.registerType('OGLShaderProgramParam', {
      members: { id: 'Integer', value: 'Integer' },
      constructor: FABRIC.RT.OGLShaderProgramParam
    });
});


/**
 * Constructor function to create a Ray object.
 * @constructor
 * @param {object} start A Vec3 defining the start of the ray.
 * @param {object} direction A Vec3 defining the direction of the ray.
 */
FABRIC.RT.OGLShaderProgram = function(name) {
  this.name = name ? name : '';
  this.programId = 0;
  this.shaderSources = [];
  this.programParams = [];
  this.uniformValues = [];
  this.attributeValues = [];
  this.disableOptions = [];
  this.enableOptions = [];
  this.cullFace = 0;
  // If Blending is enabled, we need to set the blend params
  this.blendModeSfactor = 0;
  this.blendModeDfactor = 0;
    
  this.drawMode = -1;
  this.patchVertices = -1;
  this.numInstances = -1;
  
  this.loadedAttributes = [];
  this.debug = false;
};

FABRIC.appendOnCreateContextCallback(function(context) {
  context.RegisteredTypesManager.registerType('OGLShaderProgram', {
    members: {
      name: 'String',
      programId: 'Integer',
      shaderSources: 'OGLShaderSource[]',
      programParams: 'OGLShaderProgramParam[]',
      uniformValues: 'OGLShaderValue[]',
      attributeValues: 'OGLShaderValue[]',
      disableOptions: 'Size[]',
      enableOptions: 'Size[]',
      cullFace: 'Size',
      blendModeSfactor: 'Size',
      blendModeDfactor: 'Size',
      drawMode: 'Integer',
      patchVertices: 'Integer',
      numInstances: 'Integer',
      loadedAttributes: 'Integer[]',
      debug: 'Boolean'
    },
    constructor: FABRIC.RT.OGLShaderProgram,
    kBindings: FABRIC.loadResourceURL('FABRIC_ROOT/SceneGraph/RT/OGLShaderProgram.kl')
  });
});

