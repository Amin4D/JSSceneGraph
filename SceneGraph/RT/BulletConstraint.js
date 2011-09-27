
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//
FABRIC.RT.BulletConstraint = function(options) {
  if(!options)
    options = {};
  this.pointer = null;
  this.bodyPointerA = null;
  this.bodyPointerB = null;
  this.type = -1;
  this.pivotA = options.pivotA ? options.pivotA : FABRIC.RT.xfo();
  this.pivotB = options.pivotB ? options.pivotB : FABRIC.RT.xfo();
  this.nameA = options.nameA ? options.nameA : '';
  this.nameB = options.nameB ? options.nameB : '';
  this.indexA = options.indexA != undefined ? options.indexA : 0;
  this.indexB = options.indexB != undefined ? options.indexB : 0;
  this.parameters = [];
};

// constants
FABRIC.RT.BulletConstraint.BULLET_POINT2POINT_CONSTRAINT = 3;
FABRIC.RT.BulletConstraint.BULLET_HINGE_CONSTRAINT = 4;
FABRIC.RT.BulletConstraint.BULLET_SLIDER_CONSTRAINT= 7;

FABRIC.RT.BulletConstraint.prototype = {
};

FABRIC.RT.BulletConstraint.createPoint2Point = function(options) {
  if(!options)
    options = {};
  var constraint = new FABRIC.RT.BulletConstraint(options);
  constraint.type = FABRIC.RT.BulletConstraint.BULLET_POINT2POINT_CONSTRAINT;
  return constraint;
};

FABRIC.RT.BulletConstraint.createHinge = function(options) {
  if(!options)
    options = {};
  var constraint = new FABRIC.RT.BulletConstraint(options);
  constraint.type = FABRIC.RT.BulletConstraint.BULLET_HINGE_CONSTRAINT;
  return constraint;
};

FABRIC.RT.BulletConstraint.createSlider = function(options) {
  if(!options)
    options = {};
  var constraint = new FABRIC.RT.BulletConstraint(options);
  constraint.type = FABRIC.RT.BulletConstraint.BULLET_SLIDER_CONSTRAINT;
  return constraint;
};

FABRIC.appendOnCreateContextCallback(function(context) {
  context.RegisteredTypesManager.registerType('BulletConstraint', {
    members: {
      pointer: 'Data',
      bodyPointerA: 'Data',
      bodyPointerB: 'Data',
      type: 'Integer',
      pivotA: 'Xfo',
      pivotB: 'Xfo',
      nameA: 'String',
      nameB: 'String',
      indexA: 'Integer',
      indexB: 'Integer',
      parameters: 'Scalar[]',
    },
    constructor: FABRIC.RT.BulletConstraint,
    klBindings: {
      filename: 'BulletConstraint.kl',
      sourceCode: FABRIC.loadResourceURL('FABRIC_ROOT/SceneGraph/RT/BulletConstraint.kl')
    }
  });
});
