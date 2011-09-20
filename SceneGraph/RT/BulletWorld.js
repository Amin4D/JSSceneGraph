
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//

FABRIC.RT.BulletWorld = function(options) {
  if(!options)
    options = {};
  this.pointer = null;
  this.gravity = options.gravity ? options.gravity : FABRIC.RT.vec3(0,-40,0);
  this.step = 0;
  this.substeps = options.substeps ? options.substeps : 3;
};

FABRIC.RT.BulletWorld.prototype = {
};

FABRIC.appendOnCreateContextCallback(function(context) {
  context.RegisteredTypesManager.registerType('BulletWorld', {
    members: {
      pointer: 'Data',
      gravity: 'Vec3',
      step: 'Size',
      substeps: 'Size',
    },
    constructor: FABRIC.RT.BulletWorld,
    klBindings: {
      filename: 'BulletWorld.kl',
      sourceCode: FABRIC.loadResourceURL('FABRIC_ROOT/SceneGraph/RT/BulletWorld.kl')
    }
  });
});
