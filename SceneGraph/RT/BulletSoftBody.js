
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//

FABRIC.RT.BulletSoftBody = function( options ) {
  if(!options)
    options = {};
  this.pointer = null;
  this.transform = options.transform ? options.transform : FABRIC.RT.xfo();
  this.clusters = options.clusters ? options.clusters : -1;
  this.constraints = options.constraints ? options.constraints : 2;
  this.mass = options.mass ? options.mass : 1.0;
  this.stiffness = options.stiffness ? options.stiffness : 0.05;
  this.friction = options.friction ? options.friction : 0.5;
  this.conservation = options.conservation ? options.conservation : 0.0;
  this.pressure = options.pressure ? options.pressure : 0.0;
  this.recover = options.recover ? options.recover : 0.0;
  this.trianglesNode = options.trianglesNode ? options.trianglesNode : undefined;
};

FABRIC.RT.BulletSoftBody.prototype = {
};

FABRIC.appendOnCreateContextCallback(function(context) {
  context.RegisteredTypesManager.registerType('BulletSoftBody', {
    members: {
      pointer: 'Data',
      transform: 'Xfo',
      clusters: 'Integer',
      constraints: 'Integer',
      mass: 'Scalar',
      stiffness: 'Scalar',
      friction: 'Scalar',
      conservation: 'Scalar',
      pressure: 'Scalar',
      recover: 'Scalar',
    },
    constructor: FABRIC.RT.BulletSoftBody,
    klBindings: {
      filename: 'BulletSoftBody.kl',
      sourceCode: FABRIC.loadResourceURL('FABRIC_ROOT/SceneGraph/RT/BulletSoftBody.kl')
    }
  });
});
