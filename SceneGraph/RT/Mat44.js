
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//

/**
 * Function to determine if the given object is a matrix44 object.
 * @param {object} value The object to validate.
 * @return {boolean} True if the given object is a valid matrix44.
 */
FABRIC.RT.isMat44 = function(value) {
  return typeof value === 'object' &&
    'row0' in value &&
    FABRIC.RT.isVec4(value.row0) &&
    'row1' in value &&
    FABRIC.RT.isVec4(value.row1) &&
    'row2' in value &&
    FABRIC.RT.isVec4(value.row2) &&
    'row3' in value &&
    FABRIC.RT.isVec4(value.row3);
};

/**
 * Constructor for a matrix44 object.
 * @constructor
 */
FABRIC.RT.Mat44 = function() {
  if (arguments.length == 4 &&
      FABRIC.RT.isVec4(arguments[0]) &&
      FABRIC.RT.isVec4(arguments[1]) &&
      FABRIC.RT.isVec4(arguments[2]) &&
      FABRIC.RT.isVec4(arguments[3])) {
    this.row0 = arguments[0].clone();
    this.row1 = arguments[1].clone();
    this.row2 = arguments[2].clone();
    this.row3 = arguments[3].clone();
  }
  else if (arguments.length = 16 &&
      FABRIC.RT.isScalar(arguments[0]) &&
      FABRIC.RT.isScalar(arguments[1]) &&
      FABRIC.RT.isScalar(arguments[2]) &&
      FABRIC.RT.isScalar(arguments[3]) &&
      FABRIC.RT.isScalar(arguments[4]) &&
      FABRIC.RT.isScalar(arguments[5]) &&
      FABRIC.RT.isScalar(arguments[6]) &&
      FABRIC.RT.isScalar(arguments[7]) &&
      FABRIC.RT.isScalar(arguments[8]) &&
      FABRIC.RT.isScalar(arguments[9]) &&
      FABRIC.RT.isScalar(arguments[10]) &&
      FABRIC.RT.isScalar(arguments[11]) &&
      FABRIC.RT.isScalar(arguments[12]) &&
      FABRIC.RT.isScalar(arguments[13]) &&
      FABRIC.RT.isScalar(arguments[14]) &&
      FABRIC.RT.isScalar(arguments[15])) {
    this.row0 = new FABRIC.RT.Vec4(arguments[0], arguments[1], arguments[2], arguments[3]);
    this.row1 = new FABRIC.RT.Vec4(arguments[4], arguments[5], arguments[6], arguments[7]);
    this.row2 = new FABRIC.RT.Vec4(arguments[8], arguments[9], arguments[10], arguments[11]);
    this.row3 = new FABRIC.RT.Vec4(arguments[12], arguments[13], arguments[14], arguments[15]);
  }
  else if (arguments.length == 1 &&
      FABRIC.RT.isMat44(arguments[0])) {
    this.row0 = arguments[0].row0.clone();
    this.row1 = arguments[0].row1.clone();
    this.row2 = arguments[0].row2.clone();
    this.row3 = arguments[0].row3.clone();
  }
  else if (arguments.length == 0) {
    this.row0 = FABRIC.RT.Vec4.xAxis.clone();
    this.row1 = FABRIC.RT.Vec4.yAxis.clone();
    this.row2 = FABRIC.RT.Vec4.zAxis.clone();
    this.row3 = FABRIC.RT.Vec4.tAxis.clone();
  }
  else throw'new Mat44: invalid arguments';
  };

/**
 * Overloaded Constructor for a matrix44 object.
 * @param {object} row0 The first row of the matrix44 as a Vec4 object.
 * @param {object} row1 The second row of the matrix44 as a Vec4 object.
 * @param {object} row2 The third row of the matrix44 as a Vec4 object.
 * @param {object} row3 The fourth row of the matrix44 as a Vec4 object.
 * @return {object} The matrix44 object.
 */
FABRIC.RT.mat44 = function(row0, row1, row2, row3) {
  // The following is a bit of a hack. Not sure if we can combine new and apply.
  if (arguments.length === 0) return new FABRIC.RT.Mat44();
  if (arguments.length === 1) return new FABRIC.RT.Mat44(arguments[0]);
  if (arguments.length === 4) return new FABRIC.RT.Mat44(arguments[0], arguments[1], arguments[2], arguments[3]);
  if (arguments.length === 16) return new FABRIC.RT.Mat44(arguments[0], arguments[1], arguments[2], arguments[3],
                                                          arguments[4], arguments[5], arguments[6], arguments[7],
                                                          arguments[8], arguments[9], arguments[10], arguments[11],
                                                          arguments[12], arguments[13], arguments[14], arguments[15]);
};

FABRIC.RT.Mat44.prototype = {
  eql: function(that) {
    return FABRIC.RT.isMat44(that) &&
      this.row0.eql(that.row0) &&
      this.row1.eql(that.row1) &&
      this.row2.eql(that.row2) &&
      this.row3.eql(that.row3);
  },

  // PT - Note: Everywhere else in our math library we use 'multiply'.
  // Why is it so hard to follow a convention??
  mul: function(that) {
    if (FABRIC.RT.isScalar(that)) {
      return new FABRIC.RT.Mat44(
        this.row0.multiply(that),
        this.row1.multiply(that),
        this.row2.multiply(that),
        this.row3.multiply(that)
      );
    }
    else if (FABRIC.RT.isVec4(that)) {
      return new FABRIC.RT.Vec4(
        this.row0.dot(that),
        this.row1.dot(that),
        this.row2.dot(that),
        this.row3.dot(that)
      );
    }
    else if (FABRIC.RT.isVec3(that)) {
      var temp = this.mul(FABRIC.RT.vec4(that.x, that.y, that.z, 1.0));
      return FABRIC.RT.vec3(temp.x / temp.t, temp.y / temp.t, temp.z / temp.t);
    }
    else if (FABRIC.RT.isMat44(that)) {
      return new FABRIC.RT.Mat44(
        this.row0.x * that.row0.x + this.row0.y * that.row1.x + this.row0.z * that.row2.x + this.row0.t * that.row3.x,
        this.row0.x * that.row0.y + this.row0.y * that.row1.y + this.row0.z * that.row2.y + this.row0.t * that.row3.y,
        this.row0.x * that.row0.z + this.row0.y * that.row1.z + this.row0.z * that.row2.z + this.row0.t * that.row3.z,
        this.row0.x * that.row0.t + this.row0.y * that.row1.t + this.row0.z * that.row2.t + this.row0.t * that.row3.t,
        //
        this.row1.x * that.row0.x + this.row1.y * that.row1.x + this.row1.z * that.row2.x + this.row1.t * that.row3.x,
        this.row1.x * that.row0.y + this.row1.y * that.row1.y + this.row1.z * that.row2.y + this.row1.t * that.row3.y,
        this.row1.x * that.row0.z + this.row1.y * that.row1.z + this.row1.z * that.row2.z + this.row1.t * that.row3.z,
        this.row1.x * that.row0.t + this.row1.y * that.row1.t + this.row1.z * that.row2.t + this.row1.t * that.row3.t,
        //
        this.row2.x * that.row0.x + this.row2.y * that.row1.x + this.row2.z * that.row2.x + this.row2.t * that.row3.x,
        this.row2.x * that.row0.y + this.row2.y * that.row1.y + this.row2.z * that.row2.y + this.row2.t * that.row3.y,
        this.row2.x * that.row0.z + this.row2.y * that.row1.z + this.row2.z * that.row2.z + this.row2.t * that.row3.z,
        this.row2.x * that.row0.t + this.row2.y * that.row1.t + this.row2.z * that.row2.t + this.row2.t * that.row3.t,
        //
        this.row3.x * that.row0.x + this.row3.y * that.row1.x + this.row3.z * that.row2.x + this.row3.t * that.row3.x,
        this.row3.x * that.row0.y + this.row3.y * that.row1.y + this.row3.z * that.row2.y + this.row3.t * that.row3.y,
        this.row3.x * that.row0.z + this.row3.y * that.row1.z + this.row3.z * that.row2.z + this.row3.t * that.row3.z,
        this.row3.x * that.row0.t + this.row3.y * that.row1.t + this.row3.z * that.row2.t + this.row3.t * that.row3.t
      );
    }
    else {
      throw'Mat44.mul: incompatible type';
      }
  },
  transpose: function() {
    var r = new FABRIC.RT.Mat44();
    r.row0.x = this.row0.x; r.row1.x = this.row0.y; r.row2.x = this.row0.z; r.row3.x = this.row0.t;
    r.row0.y = this.row1.x; r.row1.y = this.row1.y; r.row2.y = this.row1.z; r.row3.y = this.row1.t;
    r.row0.z = this.row2.x; r.row1.z = this.row2.y; r.row2.z = this.row2.z; r.row3.z = this.row2.t;
    r.row0.t = this.row3.x; r.row1.t = this.row3.y; r.row2.t = this.row3.z; r.row3.t = this.row3.t;
    return r;
  },
  det: function() {
    var a0 = this.row0.x * this.row1.y - this.row0.y * this.row1.x;
    var a1 = this.row0.x * this.row1.z - this.row0.z * this.row1.x;
    var a2 = this.row0.x * this.row1.t - this.row0.t * this.row1.x;
    var a3 = this.row0.y * this.row1.z - this.row0.z * this.row1.y;
    var a4 = this.row0.y * this.row1.t - this.row0.t * this.row1.y;
    var a5 = this.row0.z * this.row1.t - this.row0.t * this.row1.z;
    var b0 = this.row2.x * this.row3.y - this.row2.y * this.row3.x;
    var b1 = this.row2.x * this.row3.z - this.row2.z * this.row3.x;
    var b2 = this.row2.x * this.row3.t - this.row2.t * this.row3.x;
    var b3 = this.row2.y * this.row3.z - this.row2.z * this.row3.y;
    var b4 = this.row2.y * this.row3.t - this.row2.t * this.row3.y;
    var b5 = this.row2.z * this.row3.t - this.row2.t * this.row3.z;
    return a0 * b5 - a1 * b4 + a2 * b3 + a3 * b2 - a4 * b1 + a5 * b0;
  },
  inverse: function() {
    // Compute the determinant of the matrix.
    var det = this.det();

    var result = new FABRIC.RT.Mat44();

    if (Math.abs(det) < FABRIC.RT.precision) {
      return result;
    }

    var a0 = this.row0.x * this.row1.y - this.row0.y * this.row1.x;
    var a1 = this.row0.x * this.row1.z - this.row0.z * this.row1.x;
    var a2 = this.row0.x * this.row1.t - this.row0.t * this.row1.x;
    var a3 = this.row0.y * this.row1.z - this.row0.z * this.row1.y;
    var a4 = this.row0.y * this.row1.t - this.row0.t * this.row1.y;
    var a5 = this.row0.z * this.row1.t - this.row0.t * this.row1.z;
    var b0 = this.row2.x * this.row3.y - this.row2.y * this.row3.x;
    var b1 = this.row2.x * this.row3.z - this.row2.z * this.row3.x;
    var b2 = this.row2.x * this.row3.t - this.row2.t * this.row3.x;
    var b3 = this.row2.y * this.row3.z - this.row2.z * this.row3.y;
    var b4 = this.row2.y * this.row3.t - this.row2.t * this.row3.y;
    var b5 = this.row2.z * this.row3.t - this.row2.t * this.row3.z;

    var di = 1.0 / det;
    result.row0.x = (this.row1.y * b5 - this.row1.z * b4 + this.row1.t * b3) * di;
    result.row1.x = (-this.row1.x * b5 + this.row1.z * b2 - this.row1.t * b1) * di;
    result.row2.x = (this.row1.x * b4 - this.row1.y * b2 + this.row1.t * b0) * di;
    result.row3.x = (-this.row1.x * b3 + this.row1.y * b1 - this.row1.z * b0) * di;
    result.row0.y = (-this.row0.y * b5 + this.row0.z * b4 - this.row0.t * b3) * di;
    result.row1.y = (this.row0.x * b5 - this.row0.z * b2 + this.row0.t * b1) * di;
    result.row2.y = (-this.row0.x * b4 + this.row0.y * b2 - this.row0.t * b0) * di;
    result.row3.y = (this.row0.x * b3 - this.row0.y * b1 + this.row0.z * b0) * di;
    result.row0.z = (this.row3.y * a5 - this.row3.z * a4 + this.row3.t * a3) * di;
    result.row1.z = (-this.row3.x * a5 + this.row3.z * a2 - this.row3.t * a1) * di;
    result.row2.z = (this.row3.x * a4 - this.row3.y * a2 + this.row3.t * a0) * di;
    result.row3.z = (-this.row3.x * a3 + this.row3.y * a1 - this.row3.z * a0) * di;
    result.row0.t = (-this.row2.y * a5 + this.row2.z * a4 - this.row2.t * a3) * di;
    result.row1.t = (this.row2.x * a5 - this.row2.z * a2 + this.row2.t * a1) * di;
    result.row2.t = (-this.row2.x * a4 + this.row2.y * a2 - this.row2.t * a0) * di;
    result.row3.t = (this.row2.x * a3 - this.row2.y * a1 + this.row2.z * a0) * di;

    return result;
  },
  setDiagonal: function(v) {
    if (v.getType && v.getType() == 'FABRIC.RT.Vec4') {
      this.row0.x = v.x;
      this.row1.y = v.y;
      this.row2.z = v.z;
      this.row3.t = v.t;
    }
    else if (typeof v === 'number') {
      this.row0.x = this.row1.y = this.row2.z = this.row3.t = v;
    }
  },
  clone: function() {
    return new FABRIC.RT.Mat44(this);
  },
  toString: function() {
    return 'FABRIC.RT.mat44(' + this.row0.toString() + ',' + this.row1.toString() + ',' +
      this.row2.toString() + ',' + this.row3.toString() + ')';
  },
  getType: function() {
    return 'FABRIC.RT.Mat44';
  },
  displayGUI: function($parentDiv, changeHandlerFn) {
    var val = this;
    var fn = function() {
      changeHandlerFn(val);
    }
    var row0RefreshFn = this.row0.displayGUI($parentDiv, fn); $parentDiv.append($('<br/>'));
    var row1RefreshFn = this.row1.displayGUI($parentDiv, fn); $parentDiv.append($('<br/>'));
    var row2RefreshFn = this.row2.displayGUI($parentDiv, fn); $parentDiv.append($('<br/>'));
    var row3RefreshFn = this.row3.displayGUI($parentDiv, fn);
    var refreshFn = function(val) {
      row0RefreshFn(val.row0);
      row1RefreshFn(val.row1);
      row2RefreshFn(val.row2);
      row3RefreshFn(val.row3);
    };
    return refreshFn;
  }
};

FABRIC.appendOnCreateContextCallback(function(context) {
  context.RegisteredTypesManager.registerType('Mat44', {
    members: {
      row0: 'Vec4',
      row1: 'Vec4',
      row2: 'Vec4',
      row3: 'Vec4'
    },
    constructor: FABRIC.RT.Mat44,
    kBindings: FABRIC.loadResourceURL('FABRIC_ROOT/SceneGraph/RT/Mat44.kl')
  });
});
