
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//

//determine if an object is a valid Mat22.
FABRIC.RT.isMat22 = function(t) {
  return t && t.getType &&
         t.getType() === 'FABRIC.RT.Mat22';
};

//Constructor:
//  Supported args:
//    (none)
//    Vec2: row0, row1
//    4 scalars (_00, _01, ...)
//    Mat33
FABRIC.RT.Mat22 = function() {
  if (arguments.length == 2 &&
      FABRIC.RT.isVec2(arguments[0]) &&
      FABRIC.RT.isVec2(arguments[1])) {
    this.row0 = arguments[0].clone();
    this.row1 = arguments[1].clone();
  }
  else if (arguments.length == 4 &&
      FABRIC.RT.isScalar(arguments[0]) &&
      FABRIC.RT.isScalar(arguments[1]) &&
      FABRIC.RT.isScalar(arguments[2]) &&
      FABRIC.RT.isScalar(arguments[3])) {
    this.row0 = new FABRIC.RT.Vec2(arguments[0], arguments[1]);
    this.row1 = new FABRIC.RT.Vec2(arguments[2], arguments[3]);
  }
  else if (arguments.length == 1 && FABRIC.RT.isMat22(arguments[0])) {
    this.row0 = arguments[0].row0.clone();
    this.row1 = arguments[0].row1.clone();
  }
  else if (arguments.length == 0) {
    this.row0 = FABRIC.RT.Vec2.xAxis.clone();
    this.row1 = FABRIC.RT.Vec2.yAxis.clone();
  }
  else throw'new Mat22: invalid arguments';
  };

FABRIC.RT.Mat22.prototype = {

  //set: see constructor for supported args
  set: function() {
    FABRIC.RT.Mat22.apply(this, arguments);
    return this;
  },

  setRows: function(row0, row1) {
    this.row0 = row0.clone();
    this.row1 = row1.clone();
  },

  setColumns: function(col0, col1) {
    this.row0.x = col0.x; this.row0.y = col1.x;
    this.row1.x = col0.y; this.row1.y = col1.y;
  },

  setNull: function() {
    this.row0 = FABRIC.RT.Vec2.origin.clone();
    this.row1 = FABRIC.RT.Vec2.origin.clone();
  },

  setIdentity: function() {
    this.set();
  },

  setDiagonal: function(v) {
    if( FABRIC.RT.isScalar(v) ) {
      this.row0.x = this.row1.y = v;
    } else {
      this.row0.x = v.x;
      this.row1.y = v.y;
    }
  },

  equal: function(v) {
    return this.row0.equal(v.row0) && this.row1.equal(v.row1);
  },

  almostEqual: function(v, precision) {
    if (precision === undefined) {
      precision = Math.PRECISION;
    }
    return this.row0.almostEqual(v.row0, precision) && this.row1.almostEqual(v.row1, precision);
  },

  add: function(that) {
    return new FABRIC.RT.Mat22(
      this.row0.add(that.row0),
      this.row1.add(that.row1)
    );
  },

  subtract: function(that) {
    return new FABRIC.RT.Mat22(
      this.row0.subtract(that.row0),
      this.row1.subtract(that.row1)
    );
  },

  multiplyScalar: function(that) {
    return new FABRIC.RT.Mat22(
      this.row0.multiplyScalar(that),
      this.row1.multiplyScalar(that)
    );
  },

  multiplyVector: function(that) {
    return new FABRIC.RT.Vec2(
      this.row0.dot(that),
      this.row1.dot(that)
    );
  },

  multiply: function(that) {
    return new FABRIC.RT.Mat22(
      this.row0.x * that.row0.x + this.row0.y * that.row1.x,
      this.row0.x * that.row0.y + this.row0.y * that.row1.y,
      //
      this.row1.x * that.row0.x + this.row1.y * that.row1.x,
      this.row1.x * that.row0.y + this.row1.y * that.row1.y
    );
  },

  divideScalar: function(s) {
    Math.checkDivisor(s, 'Mat22.divideScalar');
    return this.multiplyScalar(1.0 / s);
  },

  determinant: function() {
    var value = this.row0.x * this.row1.y - this.row0.y * this.row1.x;
    return value;
  },

  adjoint: function() {
    return new FABRIC.RT.Mat22(this.row1.y, -this.row0.y, -this.row1.x, this.row0.x);
  },

  inverse: function() {
    var det = this.determinant();
    if( Math.verboseLogFunction ) {
      Math.checkDivisor(det, 'Mat22.inverse');
    }
    return this.adjoint().divideScalar(det);
  },

  transpose: function() {
    return new FABRIC.RT.Mat22(
      this.row0.x, this.row1.x,
      this.row0.y, this.row1.y);
  },

  clone: function() {
    return new FABRIC.RT.Mat22(this);
  },
  toString: function() {
    return 'FABRIC.RT.mat22(' + this.row0.toString() + ',' + this.row1.toString() + ',' + this.row2.toString() + ')';
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
    var row1RefreshFn = this.row1.displayGUI($parentDiv, fn);
    var refreshFn = function(val) {
      row0RefreshFn(val.row0);
      row1RefreshFn(val.row1);
    };
    return refreshFn;
  }
};

//Mat22 constants
FABRIC.RT.Mat22.identity = new FABRIC.RT.Mat22();

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
