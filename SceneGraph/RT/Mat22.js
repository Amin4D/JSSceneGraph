
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//

/**
 * Function to determine if the given object is a matrix22 object.
 * @param {object} value The object to validate.
 * @return {boolean} True if the given object is a valid matrix22.
 */
FABRIC.RT.isMat2 = function(value) {
  return typeof value === 'object' &&
    'row0' in value &&
    FABRIC.RT.isVec2(value.row0) &&
    'row1' in value &&
    FABRIC.RT.isVec2(value.row1);
};

/**
 * Constructor for a matrix22 object.
 * @constructor
 */
FABRIC.RT.Mat22 = function() {
  if (arguments.length == 2 &&
      FABRIC.RT.isVec2(arguments[0]) &&
      FABRIC.RT.isVec2(arguments[1])) {
    this.row0 = arguments[0].clone();
    this.row1 = arguments[1].clone();
  }
  else if (arguments.length = 4 &&
      FABRIC.RT.isScalar(arguments[0]) &&
      FABRIC.RT.isScalar(arguments[1]) &&
      FABRIC.RT.isScalar(arguments[2]) &&
      FABRIC.RT.isScalar(arguments[3])) {
    this.row0 = new FABRIC.RT.Vec2(arguments[0], arguments[1]);
    this.row1 = new FABRIC.RT.Vec2(arguments[2], arguments[3]);
  }
  else if (arguments.length == 1 &&
      FABRIC.RT.isMat22(arguments[0])) {
    this.row0 = arguments[0].row0.clone();
    this.row1 = arguments[0].row1.clone();
  }
  else if (arguments.length == 0) {
    this.row0 = FABRIC.RT.Vec2.xAxis.clone();
    this.row1 = FABRIC.RT.Vec2.yAxis.clone();
  }
  else throw'new Mat22: invalid arguments';
  };

/**
 * Overloaded Constructor for a matrix22 object.
 * @param {object} row0 The first row of the matrix22 as a Vec2 object.
 * @param {object} row1 The second row of the matrix22 as a Vec2 object.
 * @return {object} The matrix22 object.
 */
FABRIC.RT.mat22 = function(row0, row1) {
  return new FABRIC.RT.Mat22(row0, row1);
};

FABRIC.RT.Mat22.prototype = {
  eql: function(that) {
    return FABRIC.RT.isMat22(that) &&
      this.row0.eql(that.row0) &&
      this.row1.eql(that.row1);
  },

  mul: function(that) {
    if (FABRIC.RT.isScalar(that))
      return new FABRIC.RT.Mat22(
      this.row0.multiply(that),
      this.row1.multiply(that)
    );
    else if (FABRIC.RT.isVec2(that))
      return new FABRIC.RT.Vec2(
      this.row0.dot(that),
      this.row1.dot(that)
    );
    else if (FABRIC.RT.isMat22(that))
      return new FABRIC.RT.Mat22(
      this.row0.x * that.row0.x + this.row0.y * that.row1.x,
      this.row0.x * that.row0.y + this.row0.y * that.row1.y,
      //
      this.row1.x * that.row0.x + this.row1.y * that.row1.x,
      this.row1.x * that.row0.y + this.row1.y * that.row1.y
    );
    else throw'Mat22.mul: incompatible type';
    },

  clone: function() {
    return new FABRIC.RT.Mat22(this);
  },
  toString: function() {
    return 'FABRIC.RT.mat22(' + this.row0.toString() + ',' + this.row1.toString() + ')';
  },
  getType: function() {
    return 'FABRIC.RT.Mat22';
  },
  displayGUI: function($parentDiv, changeHandlerFn) {
    var val = this;
    var fn = function() {
      changeHandlerFn(val);
    }
    var row0RefreshFn = this.row0.displayGUI($parentDiv, fn); $parentDiv.append($('<br/>'));
    var row1RefreshFn = this.row1.displayGUI($parentDiv, fn);;
    var refreshFn = function(val) {
      row0RefreshFn(val.row0);
      row1RefreshFn(val.row1);
    };
    return refreshFn;
  }
};

FABRIC.appendOnCreateContextCallback(function(context) {
  context.RegisteredTypesManager.registerType('Mat22', {
    members: {
      row0: 'Vec2',
      row1: 'Vec2'
    },
    constructor: FABRIC.RT.Mat22,
    klBindings: {
      filename: 'Mat22.kl',
      sourceCode: FABRIC.loadResourceURL('FABRIC_ROOT/SceneGraph/RT/Mat22.kl')
    }
  });
});
