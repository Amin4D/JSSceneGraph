
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//
FABRIC.RT.BulletForce = function(options) {
  if(!options)
    options = {};
  this.origin = options.origin != undefined ? options.origin : FABRIC.RT.vec3(0,0,0);
  this.direction = options.direction != undefined ? options.direction : FABRIC.RT.vec3(0,1,0);
  this.radius = options.radius != undefined ? options.radius : 1.5;
  this.factor = options.factor != undefined ? options.factor : 100.0;
  this.useTorque = options.useTorque != undefined ? options.useTorque : true;
  this.useFalloff = options.useFalloff != undefined ? options.useFalloff : true;
  this.enabled = options.enabled != undefined ? options.enabled : true;
  this.autoDisable = options.autoDisable != undefined ? options.autoDisable : false;
};

FABRIC.RT.BulletForce.prototype = {
};

FABRIC.appendOnCreateContextCallback(function(context) {
  context.RegisteredTypesManager.registerType('BulletForce', {
    members: {
      origin: 'Vec3',
      direction: 'Vec3',
      radius: 'Scalar',
      factor: 'Scalar',
      useTorque: 'Boolean',
      useFalloff: 'Boolean',
      enabled: 'Boolean',
      autoDisable: 'Boolean'
    },
    constructor: FABRIC.RT.BulletForce
  });
});
