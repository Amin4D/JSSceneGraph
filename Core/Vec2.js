
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//

//determine if an object is a valid Vec2.
FABRIC.RT.isVec2 = function(t) {
  return t && t.getType &&
         t.getType() === 'FABRIC.RT.Vec2';
};

//Constructor:
//  Supported args:
//    (none)
//    x, y
//    Vec
FABRIC.RT.Vec2 = function() {
  if (arguments.length == 2 &&
      FABRIC.RT.isScalar(arguments[0]) && 
      FABRIC.RT.isScalar(arguments[1]) ) {
    this.x = arguments[0];
    this.y = arguments[1];
  }
  else if (arguments.length == 1 && FABRIC.RT.isVec2(arguments[0])) {
    this.x = arguments[0].x;
    this.y = arguments[0].y;
  }
  else if (arguments.length == 0) {
    this.x = 0;
    this.y = 0;
  }
  else throw'new Vec2: invalid arguments';
  };

FABRIC.RT.Vec2.prototype = {

  //set: see constructor for supported args
  set: function() {
    FABRIC.RT.Vec2.apply(this, arguments);
    return this;
  },

  setNull: function(x, y) {
    this.x = 0; this.y = 0;
  },

  equal: function(v) {
    var result = //JS bug: if the condition is directly returned it is wrong (??)
      this.x === v.x &&
      this.y === v.y;
    return result;
  },

  almostEqual: function(v, precision) {
    if (precision === undefined) {
      precision = Math.PRECISION;
    }
    var result = //JS bug: if the condition is directly returned it is wrong (??)
      (Math.abs(this.x - v.x) < precision) &&
      (Math.abs(this.y - v.y) < precision);
    return result;
  },

  // Returns the result of adding the argument to the vector
  add: function(v) {
    return new FABRIC.RT.Vec2(this.x + v.x, this.y + v.y);
  },

  subtract: function(v) {
    return new FABRIC.RT.Vec2(this.x - v.x, this.y - v.y);
  },

  multiply: function(v) {
    return new FABRIC.RT.Vec2(this.x * v.x, this.y * v.y);
  },

  multiplyScalar: function(s) {
    return new FABRIC.RT.Vec2(this.x * s, this.y * s);
  },

  divide: function(v) {
    if( Math.verboseLogFunction ) {
      Math.checkDivisor(v.x, 'Vec2.divide v.x');
      Math.checkDivisor(v.y, 'Vec2.divide v.y');
    }
    return new FABRIC.RT.Vec2(this.x / v.x, this.y / v.y);
  },

  divideScalar: function(s) {
    Math.checkDivisor(s, 'Vec2.divideScalar');
    return this.multiplyScalar(1.0 / s);
  },

  negate: function(v) {
    return new FABRIC.RT.Vec2(-this.x, - this.y);
  },

  inverse: function(v) {
    if( Math.verboseLogFunction ) {
      Math.checkDivisor(this.x, 'Vec2.inverse this.x');
      Math.checkDivisor(this.y, 'Vec2.inverse this.y');
    }
    return new FABRIC.RT.Vec2(1.0/this.x, 1.0/this.y);
  },

  dot: function(v) {
    return (this.x * v.x) + (this.y * v.y);
  },

  cross: function(v) {
    return (this.x * v.y) - (this.y * v.x);
  },

  length: function() {
    return Math.sqrt(this.dot(this));
  },

  lengthSquared: function() {
    return this.dot(this);
  },

  unit: function() {
    var len = this.length();
    Math.checkDivisor(len, 'Vec2.unit');
    return this.divideScalar(len);
  },

  //Note: setUnit returns the previous length
  setUnit: function() {
    var len = this.length();
    Math.checkDivisor(len, 'Vec2.setUnit');
    var invLen = 1.0 / len;
    this.x *= invLen;
    this.y *= invLen;
    return len;
  },

  clamp: function(min, max) {
    return new FABRIC.RT.Vec2(
      (this.x < min.x ? min.x : (this.x > max.x ? max.x : this.x)),
      (this.y < min.y ? min.y : (this.y > max.y ? max.y : this.y))
    );
  },

  //Note: expects both vectors to be units (else use angleTo)
  unitsAngleTo: function(v) {
    var acosAngle = Math.clamp(this.dot(v), -1.0, 1.0);
    return Math.acos(acosAngle);
  },

  angleTo: function(v) {
    return this.unit().unitsAngleTo(v.unit());
  },

  distanceTo: function(other) {
    return this.subtract(other).length();
  },

  linearInterpolate: function(other, s) {
    return this.add(other.subtract(this).multiplyScalar(s));
  },

  // Returns a copy of the vector
  clone: function() {
    return (new FABRIC.RT.Vec2(this.x, this.y));
  },

  toString: function() {
    return 'FABRIC.RT.vec2(' + this.x + ',' + this.y + ')';
  },
  getType: function() {
    return 'FABRIC.RT.Vec2';
  },
  displayGUI: function($parentDiv, changeHandlerFn) {
    var val = this;
    var fn = function() {
      changeHandlerFn(val);
    }
    var size = 47;
    var $xWidget = $('<input type="number" style="width:' + size + '%" value="' + this.x + '"/>').bind(
      'change', function(event, ui) {
        val.x = parseFloat($(this).val()); fn();
    });
    var $yWidget = $('<input type="number" style="width:' + size + '%" value="' + this.y + '"/>').bind(
      'change', function(event, ui) {
        val.y = parseFloat($(this).val()); fn();
    });

    $parentDiv.append($xWidget);
    $parentDiv.append($yWidget);
    return function() {
      $xWidget.val(val.x);
      $yWidget.val(val.y);
    }
  }
};

//Vec2 constants
FABRIC.RT.Vec2.origin = new FABRIC.RT.Vec2(0, 0);
FABRIC.RT.Vec2.xAxis = new FABRIC.RT.Vec2(1, 0);
FABRIC.RT.Vec2.yAxis = new FABRIC.RT.Vec2(0, 1);

FABRIC.appendOnCreateContextCallback(function(context) {
  context.RegisteredTypesManager.registerType('Vec2', {
    members: {
      x: 'Scalar', y: 'Scalar'
    },
    constructor: FABRIC.RT.Vec2,
    klBindings: {
      filename: 'Vec2.kl',
      sourceCode: FABRIC.loadResourceURL('FABRIC_ROOT/SceneGraph/RT/Vec2.kl')
    }
  });
});
