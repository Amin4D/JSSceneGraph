
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//

/**
 * Function to determine if the given object is a matrix33 object.
 * @param {object} value The object to validate.
 * @return {boolean} True if the given object is a valid matrix33.
 */
FABRIC.RT.isMat33 = function(value) {
  return typeof value === 'object' &&
    'row0' in value &&
    FABRIC.RT.isVec3(value.row0) &&
    'row1' in value &&
    FABRIC.RT.isVec3(value.row1) &&
    'row2' in value &&
    FABRIC.RT.isVec3(value.row2);
};

/**
 * Constructor for a matrix33 object.
 * @constructor
 */
FABRIC.RT.Mat33 = function() {
  if (arguments.length == 3 &&
      FABRIC.RT.isVec3(arguments[0]) &&
      FABRIC.RT.isVec3(arguments[1]) &&
      FABRIC.RT.isVec3(arguments[2])) {
    this.row0 = arguments[0].clone();
    this.row1 = arguments[1].clone();
    this.row2 = arguments[2].clone();
  }
  else if (arguments.length = 9 &&
      FABRIC.RT.isScalar(arguments[0]) &&
      FABRIC.RT.isScalar(arguments[1]) &&
      FABRIC.RT.isScalar(arguments[2]) &&
      FABRIC.RT.isScalar(arguments[3]) &&
      FABRIC.RT.isScalar(arguments[4]) &&
      FABRIC.RT.isScalar(arguments[5]) &&
      FABRIC.RT.isScalar(arguments[6]) &&
      FABRIC.RT.isScalar(arguments[7]) &&
      FABRIC.RT.isScalar(arguments[8])) {
    this.row0 = new FABRIC.RT.Vec3(arguments[0], arguments[1], arguments[2]);
    this.row1 = new FABRIC.RT.Vec3(arguments[3], arguments[4], arguments[5]);
    this.row2 = new FABRIC.RT.Vec3(arguments[6], arguments[7], arguments[8]);
  }
  else if (arguments.length == 1 &&
      FABRIC.RT.isMat33(arguments[0])) {
    this.row0 = arguments[0].row0.clone();
    this.row1 = arguments[0].row1.clone();
    this.row2 = arguments[0].row2.clone();
  }
  else if (arguments.length == 0) {
    this.row0 = FABRIC.RT.Vec3.xAxis.clone();
    this.row1 = FABRIC.RT.Vec3.yAxis.clone();
    this.row2 = FABRIC.RT.Vec3.zAxis.clone();
  }
  else throw'new Mat33: invalid arguments';
  };

/**
 * Overloaded Constructor for a matrix33 object.
 * @param {object} row0 The first row of the matrix33 as a Vec3 object.
 * @param {object} row1 The second row of the matrix33 as a Vec3 object.
 * @param {object} row2 The third row of the matrix33 as a Vec3 object.
 * @return {object} The matrix33 object.
 */
FABRIC.RT.mat33 = function(row0, row1, row2) {
  return new FABRIC.RT.Mat33(row0, row1, row2);
};

FABRIC.RT.Mat33.prototype = {
  eql: function(that) {
    return FABRIC.RT.isMat33(that) &&
      this.row0.eql(that.row0) &&
      this.row1.eql(that.row1) &&
      this.row2.eql(that.row2);
  },

  mul: function(that) {
    if (FABRIC.RT.isScalar(that))
      return new FABRIC.RT.Mat33(
      this.row0.multiply(that),
      this.row1.multiply(that),
      this.row2.multiply(that)
    );
    else if (FABRIC.RT.isVec3(that))
      return new FABRIC.RT.Vec3(
      this.row0.dot(that),
      this.row1.dot(that),
      this.row2.dot(that)
    );
    else if (FABRIC.RT.isMat33(that))
      return new FABRIC.RT.Mat33(
      this.row0.x * that.row0.x + this.row0.y * that.row1.x + this.row0.z * that.row2.x,
      this.row0.x * that.row0.y + this.row0.y * that.row1.y + this.row0.z * that.row2.y,
      this.row0.x * that.row0.z + this.row0.y * that.row1.z + this.row0.z * that.row2.z,
      //
      this.row1.x * that.row0.x + this.row1.y * that.row1.x + this.row1.z * that.row2.x,
      this.row1.x * that.row0.y + this.row1.y * that.row1.y + this.row1.z * that.row2.y,
      this.row1.x * that.row0.z + this.row1.y * that.row1.z + this.row1.z * that.row2.z,
      //
      this.row2.x * that.row0.x + this.row2.y * that.row1.x + this.row2.z * that.row2.x,
      this.row2.x * that.row0.y + this.row2.y * that.row1.y + this.row2.z * that.row2.y,
      this.row2.x * that.row0.z + this.row2.y * that.row1.z + this.row2.z * that.row2.z
    );
    else throw'Mat33.mul: incompatible type';
    },

  clone: function() {
    return new FABRIC.RT.Mat33(this);
  },
  toString: function() {
    return 'FABRIC.RT.mat33(' + this.row0.toString() + ',' + this.row1.toString() + ',' + this.row2.toString() + ')';
  },
  getType: function() {
    return 'FABRIC.RT.Mat33';
  },
  displayGUI: function($parentDiv, changeHandlerFn) {
    var val = this;
    var fn = function() {
      changeHandlerFn(val);
    }
    var row0RefreshFn = this.row0.displayGUI($parentDiv, fn); $parentDiv.append($('<br/>'));
    var row1RefreshFn = this.row1.displayGUI($parentDiv, fn); $parentDiv.append($('<br/>'));
    var row2RefreshFn = this.row2.displayGUI($parentDiv, fn);
    var refreshFn = function(val) {
      row0RefreshFn(val.row0);
      row1RefreshFn(val.row1);
      row2RefreshFn(val.row2);
    };
    return refreshFn;
  }
};

FABRIC.appendOnCreateContextCallback(function(context) {
  context.RegisteredTypesManager.registerType('Mat33', {
    members: {
      row0: 'Vec3',
      row1: 'Vec3',
      row2: 'Vec3'
    },
    constructor: FABRIC.RT.Mat33,
    klBindings: {
      filename: 'Mat33.kl',
      sourceCode: FABRIC.loadResourceURL('FABRIC_ROOT/SceneGraph/RT/Mat33.kl')
    }
  });
});
