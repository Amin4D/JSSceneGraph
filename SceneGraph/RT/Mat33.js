
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//

//determine if an object is a valid Mat33.
FABRIC.RT.isMat33 = function(t) {
  return t && t.getType &&
         t.getType() === 'FABRIC.RT.Mat33';
};

//Constructor:
//  Supported args:
//    (none)
//    Vec3: row0, row1, row2
//    9 scalars (_00, _01, ...)
//    Mat33
FABRIC.RT.Mat33 = function() {
  if (arguments.length == 3 &&
      FABRIC.RT.isVec3(arguments[0]) &&
      FABRIC.RT.isVec3(arguments[1]) &&
      FABRIC.RT.isVec3(arguments[2])) {
    this.row0 = arguments[0].clone();
    this.row1 = arguments[1].clone();
    this.row2 = arguments[2].clone();
  }
  else if (arguments.length == 9 &&
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
  else if (arguments.length == 1 && FABRIC.RT.isMat33(arguments[0])) {
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

FABRIC.RT.Mat33.prototype = {

  //set: see constructor for supported args
  set: function() {
    FABRIC.RT.Mat33.apply(this, arguments);
    return this;
  },

  setRows: function(row0, row1, row2) {
    this.row0 = row0.clone();
    this.row1 = row1.clone();
    this.row2 = row2.clone();
  },

  setColumns: function(col0, col1, col2) {
    this.row0.x = col0.x; this.row0.y = col1.x; this.row0.z = col2.x;
    this.row1.x = col0.y; this.row1.y = col1.y; this.row1.z = col2.y;
    this.row2.x = col0.z; this.row2.y = col1.z; this.row2.z = col2.z;
  },

  setNull: function() {
    this.row0 = FABRIC.RT.Vec3.origin.clone();
    this.row1 = FABRIC.RT.Vec3.origin.clone();
    this.row2 = FABRIC.RT.Vec3.origin.clone();
  },

  setIdentity: function() {
    this.set();
  },

  setDiagonal: function(v) {
    if( FABRIC.RT.isScalar(v) ) {
      this.row0.x = this.row1.y = this.row2.z = v;
    } else {
      this.row0.x = v.x;
      this.row1.y = v.y;
      this.row2.z = v.z;
    }
  },

  equal: function(v) {
    return this.row0.equal(v.row0) && this.row1.equal(v.row1) && this.row2.equal(v.row2);
  },

  almostEqual: function(v, precision) {
    if (precision === undefined) {
      precision = Math.PRECISION;
    }
    return this.row0.almostEqual(v.row0, precision) && this.row1.almostEqual(v.row1, precision) && this.row2.almostEqual(v.row2, precision);
  },

  add: function(that) {
    return new FABRIC.RT.Mat33(
      this.row0.add(that.row0),
      this.row1.add(that.row1),
      this.row2.add(that.row2)
    );
  },

  subtract: function(that) {
    return new FABRIC.RT.Mat33(
      this.row0.subtract(that.row0),
      this.row1.subtract(that.row1),
      this.row2.subtract(that.row2)
    );
  },

  multiplyScalar: function(that) {
    return new FABRIC.RT.Mat33(
      this.row0.multiplyScalar(that),
      this.row1.multiplyScalar(that),
      this.row2.multiplyScalar(that)
    );
  },

  multiplyVector: function(that) {
    return new FABRIC.RT.Vec3(
      this.row0.dot(that),
      this.row1.dot(that),
      this.row2.dot(that)
    );
  },

  multiply: function(that) {
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
  },

  divideScalar: function(s) {
    Math.checkDivisor(s, 'Mat33.divideScalar');
    return this.multiplyScalar(1.0 / s);
  },

  determinant: function() {
    var value = this.row0.x * this.row1.y * this.row2.z
      + this.row0.y * this.row1.z * this.row2.x
      + this.row0.z * this.row1.x * this.row2.y
      - this.row0.x * this.row1.z * this.row2.y
      - this.row0.y * this.row1.x * this.row2.z
      - this.row0.z * this.row1.y * this.row2.x;
    return value;
  },

  adjoint: function() {
    return new FABRIC.RT.Mat33(
        this.row1.y * this.row2.z - this.row1.z * this.row2.y,
        this.row0.z * this.row2.y - this.row0.y * this.row2.z,
        this.row0.y * this.row1.z - this.row0.z * this.row1.y,

        this.row1.z * this.row2.x - this.row1.x * this.row2.z,
        this.row0.x * this.row2.z - this.row0.z * this.row2.x,
        this.row0.z * this.row1.x - this.row0.x * this.row1.z,

        this.row1.x * this.row2.y - this.row1.y * this.row2.x,
        this.row0.y * this.row2.x - this.row0.x * this.row2.y,
        this.row0.x * this.row1.y - this.row0.y * this.row1.x);
  },

  inverse: function() {
    var det = this.determinant();
    if( Math.verboseLogFunction ) {
      Math.checkDivisor(det, 'Mat33.inverse');
    }
    return this.adjoint().divideScalar(det);
  },

  transpose: function() {
    return new FABRIC.RT.Mat33(
      this.row0.x, this.row1.x, this.row2.x,
      this.row0.y, this.row1.y, this.row2.y,
      this.row0.z, this.row1.z, this.row2.z);
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

//Mat33 constants
FABRIC.RT.Mat33.identity = new FABRIC.RT.Mat33();

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
