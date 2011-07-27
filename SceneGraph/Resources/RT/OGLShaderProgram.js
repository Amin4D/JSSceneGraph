
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
      constructor: FABRIC.RT.ShaderSource
    });
});

/**
 * Struct to store information about a single shader's value
 * @constructor
 * @param {string} name The name of the shader's value.
 * @param {string} id The id of the shader's value.
 * @param {array} state The state of the shader's value.
 */
FABRIC.RT.OGLShaderValue = function(name, id, state) {
  this.name = (name !== undefined) ? name : '';
  this.id = (id !== undefined) ? id : 0;
  this.state = (state !== undefined) ? state : [];
  this.location = -1;
};

FABRIC.appendOnCreateContextCallback(function(context) {
  context.RegisteredTypesManager.registerType('OGLShaderValue', {
      members: { name: 'String', id: 'Integer', state: 'String[]', location: 'Integer' },
      constructor: FABRIC.RT.ShaderValue
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
      constructor: FABRIC.RT.ShaderProgramParam
    });
});


/**
 * Constructor function to create a Ray object.
 * @constructor
 * @param {object} start A Vec3 defining the start of the ray.
 * @param {object} direction A Vec3 defining the direction of the ray.
 */
FABRIC.RT.OGLShaderProgram = function(name) {
  this.name = name;
  this.programId = 0;
  this.shaderSources = shaderSources ? shaderSources : [];
  this.programParams = programParams ? programParams : [];
  this.uniformValues = uniformValues ? uniformValues : [];
  this.attributeValues = attributeValues ? attributeValues : [];
};

FABRIC.appendOnCreateContextCallback(function(context) {
  context.RegisteredTypesManager.registerType('OGLShaderProgram', {
    members: {
      name: 'String',
      programId: 'Integer',
      shaderSources: 'OGLShaderSource[]',
      programParams: 'OGLShaderProgramParam[]',
      uniformValues: 'OGLShaderValue[]',
      attributeValues: 'OGLShaderValue[]'
    },
    constructor: FABRIC.RT.OGLShaderProgram,
    kBindings: FABRIC.loadResourceURL('FABRIC_ROOT/SceneGraph/Resources/RT/OGLShaderProgram.kl')
  });
});

