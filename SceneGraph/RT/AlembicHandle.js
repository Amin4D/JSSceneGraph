
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//
/**
 * Constructor function to create a Ray object.
 * @constructor
 * @param {object} start A Vec3 defining the start of the ray.
 * @param {object} direction A Vec3 defining the direction of the ray.
 */
FABRIC.RT.AlembicHandle = function() {
  this.pointer = null;
  this.numSamples = 0;
};

FABRIC.appendOnCreateContextCallback(function(context) {
  context.RegisteredTypesManager.registerType('AlembicHandle', {
    members: {
     pointer: 'Data',
     numSamples: 'Integer'
    },
    constructor: FABRIC.RT.AlembicHandle,
    klBindings: {
      filename: 'AlembicHandle.kl',
      sourceCode: FABRIC.loadResourceURL('FABRIC_ROOT/SceneGraph/RT/AlembicHandle.kl')
    }
  });
});


