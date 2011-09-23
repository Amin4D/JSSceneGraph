
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//

/**
 * Function to determine if an object is a valid vec4.
 * @param {object} vec4 The vec4 object to validate.
 * @return {boolean} true if the given object is a valid vec4.
 */
FABRIC.RT.isVec4 = function(vec4) {
  return typeof vec4 === 'object' &&
    'x' in vec4 &&
    typeof vec4.x === 'number' &&
    'y' in vec4 &&
    typeof vec4.y === 'number' &&
    'z' in vec4 &&
    typeof vec4.z === 'number' &&
    't' in vec4 &&
    typeof vec4.t === 'number';
};

FABRIC.RT.Vec4 = function(x, y, z, t) {
  if (typeof x === 'number' && typeof y === 'number' && typeof z === 'number' && typeof t === 'number') {
    this.x = x;
    this.y = y;
    this.z = z;
    this.t = t;
  }
  else if (FABRIC.RT.isVec4(x) && y === undefined && z === undefined && t === undefined) {
    this.x = x.x;
    this.y = x.y;
    this.z = x.z;
    this.t = x.t;
  }
  else if (x === undefined && y === undefined && z === undefined && t === undefined) {
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.t = 0;
  }
  else throw'new Vec4: invalid arguments';
  };

FABRIC.RT.Vec4.prototype = {

  set: function(x, y, z, t) {
    if (typeof x === 'number')
    {
      this.x = x;
      this.y = y;
      this.z = z;
      this.t = t;
    }
    else
    {
      this.x = x.x;
      this.y = x.y;
      this.z = x.z;
      this.t = x.t;
    }
  },

  setNull: function(x, y, z, t) {
    this.x = 0; this.y = 0; this.z = 0; this.t = 0;
  },

  equal: function(v) {
    return (FABRIC.RT.isVec4(v) &&
      this.x === v.x &&
      this.y === v.y &&
      this.z === v.z &&
      this.t === v.t);
  },

  almostEqual: function(v, precision) {
    if (precision === undefined) {
      precision = Math.PRECISION;
    }
    var result = 
    //return //??Returning this directly outputs the wrong answer?
      (Math.abs(this.x - v.x) < precision) &&
      (Math.abs(this.y - v.y) < precision) &&
      (Math.abs(this.z - v.z) < precision) &&
      (Math.abs(this.t - v.t) < precision);
    return result;
  },

  // Returns the result of adding the argument to the vector
  add: function(v) {
    return new FABRIC.RT.Vec4(this.x + v.x, this.y + v.y, this.z + v.z, this.t + v.t);
  },

  subtract: function(v) {
    return new FABRIC.RT.Vec4(this.x - v.x, this.y - v.y, this.z - v.z, this.t - v.t);
  },

  multiply: function(v) {
    return new FABRIC.RT.Vec4(this.x * v.x, this.y * v.y, this.z * v.z, this.t * v.t);
  },

  multiplyScalar: function(s) {
    return new FABRIC.RT.Vec4(this.x * s, this.y * s, this.z * s, this.t * s);
  },

  divide: function(v) {
    return new FABRIC.RT.Vec4(this.x / v.x, this.y / v.y, this.z / v.z, this.t / v.t);
  },

  divideScalar: function(v) {
    return this.multiply(1.0 / v);
  },

  negate: function(v) {
    return new FABRIC.RT.Vec4(-this.x, - this.y, - this.z, - this.t);
  },

  dot: function(v) {
    return (this.x * v.x) + (this.y * v.y) + (this.z * v.z) + (this.t * v.t);
  },

  length: function() {
    return Math.sqrt(this.dot(this));
  },

  lengthSquared: function() {
    return this.dot(this);
  },

  unit: function() {
    var len = this.length();
    if (len > Math.DIVIDEPRECISION) {
      return this.divideScalar(1.0/len);
    }
    return this.clone();
  },

  setUnit: function() {
    var len = this.length();
    if (len > Math.DIVIDEPRECISION) {
      var invLen = 1.0 / len;
      this.x *= invLen;
      this.y *= invLen;
      this.z *= invLen;
      this.t *= invLen;
    }
    return len;
  },

  //expects that both vectors are unit
  unitsGetAngleTo: function(v) {
    return Math.acos(this.dot(v));
  },

  lerp: function(s) {
    return this.add(other.subtract(this).multiplyScalar(s));
  },

  clone: function() {
    return (new FABRIC.RT.Vec4(this.x, this.y, this.z, this.t));
  },

  toString: function() {
    return 'FABRIC.RT.vec4(' + this.x + ',' + this.y + ',' + this.z + ',' + this.t + ')';
  },
  getType: function() {
    return 'FABRIC.RT.Vec4';
  },
  displayGUI: function($parentDiv, changeHandlerFn) {
    var val = this;
    var fn = function() {
      changeHandlerFn(val);
    }
    var size = 22;
    var $xWidget = $('<input type="number" style="width:' + size + '%" value="' + this.x + '"/>').bind(
      'change', function(event, ui) {
        val.x = parseFloat($(this).val()); fn();
    });
    var $yWidget = $('<input type="number" style="width:' + size + '%" value="' + this.y + '"/>').bind(
      'change', function(event, ui) {
        val.y = parseFloat($(this).val()); fn();
    });
    var $zWidget = $('<input type="number" style="width:' + size + '%" value="' + this.y + '"/>').bind(
      'change', function(event, ui) {
        val.z = parseFloat($(this).val()); fn();
    });
    var $tWidget = $('<input type="number" style="width:' + size + '%" value="' + this.y + '"/>').bind(
      'change', function(event, ui) {
        val.t = parseFloat($(this).val()); fn();
    });

    $parentDiv.append($xWidget);
    $parentDiv.append($yWidget);
    $parentDiv.append($zWidget);
    $parentDiv.append($tWidget);
    var refreshFn = function(val) {
      $xWidget.val(val.x);
      $yWidget.val(val.y);
      $zWidget.val(val.z);
      $tWidget.val(val.t);
    };
    return refreshFn;
  }
};

//Vec4 constants
FABRIC.RT.Vec4.xAxis = new FABRIC.RT.Vec4(1, 0, 0, 0);
FABRIC.RT.Vec4.yAxis = new FABRIC.RT.Vec4(0, 1, 0, 0);
FABRIC.RT.Vec4.zAxis = new FABRIC.RT.Vec4(0, 0, 1, 0);
FABRIC.RT.Vec4.tAxis = new FABRIC.RT.Vec4(0, 0, 0, 1);

FABRIC.appendOnCreateContextCallback(function(context) {
  context.RegisteredTypesManager.registerType('Vec4', {
    members: {
      x: 'Scalar', y: 'Scalar', z: 'Scalar', t: 'Scalar'
    },
    constructor: FABRIC.RT.Vec4,
    klBindings: {
      filename: 'Vec4.kl',
      sourceCode: FABRIC.loadResourceURL('FABRIC_ROOT/SceneGraph/RT/Vec4.kl')
    }
  });
});
