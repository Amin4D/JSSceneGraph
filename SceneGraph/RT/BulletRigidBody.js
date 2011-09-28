
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//

FABRIC.RT.BulletRigidBody = function(options) {
  if(options == undefined)
    options = {};
  this.pointer = null;
  this.transform = options.transform != undefined ? options.transform: FABRIC.RT.xfo();
  this.mass = options.mass != undefined ? options.mass: 1.0;
  this.friction = options.friction != undefined ? options.friction: 0.9;
  this.restitution = options.restitution != undefined ? options.restitution: 0.0;
};

FABRIC.RT.BulletRigidBody.prototype = {
};

FABRIC.appendOnCreateContextCallback(function(context) {
  context.RegisteredTypesManager.registerType('BulletRigidBody', {
    members: {
      pointer: 'Data',
      transform: 'Xfo',
      mass: 'Scalar',
      friction: 'Scalar',
      restitution: 'Scalar',
    },
    constructor: FABRIC.RT.BulletRigidBody,
    klBindings: {
      filename: 'BulletRigidBody.kl',
      sourceCode: FABRIC.loadResourceURL('FABRIC_ROOT/SceneGraph/RT/BulletRigidBody.kl')
    }
  });
});
