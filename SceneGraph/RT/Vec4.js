
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

/**
 * Constructor for a vec4 object.
 * @constructor
 * @param {number} x The x component.
 * @param {number} y The y component.
 * @param {number} z The z component.
 * @param {number} t The t component.
 */
FABRIC.RT.Vec4 = function(x, y, z, t) {
  if (typeof x === 'number' && typeof y === 'number' && typeof z === 'number' && typeof t === 'number') {
    this.x = x;
    this.y = y;
    this.z = z;
    this.t = t;
  }
  else if (FABRIC.RT.isVec3(x) && y === undefined && z === undefined && t === undefined) {
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

/**
 * Overloaded Constructor for a vec4 object.
 * @param {number} x The x component.
 * @param {number} y The y component.
 * @param {number} z The z component.
 * @param {number} t The t component.
 * @return {object} The created vec4 object.
 */
FABRIC.RT.vec4 = function(x, y, z, t) {
  return new FABRIC.RT.Vec4(x, y, z, t);
};

FABRIC.RT.Vec4.prototype = {
  set: function(x, y, z, t) {
    this.x = x; this.y = y; this.z = z; this.t = t;
    return this;
  },
  // Returns true if the vector is equal to the argument
  eql: function(v) {
    return (FABRIC.RT.isVec4(v) &&
      (Math.abs(this.x - v.x) < Math.PRECISION) &&
      (Math.abs(this.y - v.y) < Math.PRECISION) &&
      (Math.abs(this.z - v.z) < Math.PRECISION) &&
      (Math.abs(this.t - v.t) < Math.PRECISION));
  },

  scale: function(s) {
    return new FABRIC.RT.Vec4(this.x * s, this.y * s, this.z * s, this.t * s);
  },
  scaleInPlace: function(s) {
    this.x *= s; this.y *= s; this.z *= s; this.t *= s;
  },

  // Returns the result of adding the argument to the vector
  add: function(v) {
    return new FABRIC.RT.Vec4(this.x + v.x, this.y + v.y, this.z + v.z, this.t + v.t);
  },

  addInPlace: function(v) {
    this.x += v.x; this.y += v.y; this.z += v.z; this.t += v.t;
    return this;
  },

  subtract: function(v) {
    return new FABRIC.RT.Vec4(this.x - v.x, this.y - v.y, this.z - v.z, this.t - v.t);
  },

  subInPlace: function(v) {
    this.x -= v.x; this.y -= v.y; this.z -= v.z; this.t -= v.t;
    return this;
  },

  multiply: function(v) {
    if (typeof v == 'number') {
      return new FABRIC.RT.Vec4(this.x * v, this.y * v, this.z * v, this.t * v);
    }else if (FABRIC.RT.isVec4(v)) {
      return new FABRIC.RT.Vec4(this.x * v.x, this.y * v.y, this.z * v.z, this.t * v.t);
    }else {
      throw'Incorrect param type for Multiply';
      }
  },

  mulInPlace: function(v) {
    if (typeof v == 'number') {
      this.x *= v; this.y *= v; this.z *= v; this.t *= v;
    }else if (FABRIC.RT.isVec4(v)) {
      this.x *= v.x; this.y *= v.y; this.z *= v.z; this.t *= v.t;
    }else {
      throw'Incorrect param type for Multiply';
      }
    return this;
  },

  divide: function(v) {
    return this.multiply(1.0 / v);
  },

  divInPlace: function(v) {
    return this.mulInPlace(1.0 / v);
  },

  negate: function(v) {
    return new FABRIC.RT.Vec4(-this.x, - this.y, - this.z, - this.t);
  },

  negateInPlace: function(v) {
    this.x = - this.x;
    this.y = - this.y;
    this.z = - this.z;
    this.t = - this.t;
  },

  // Returns the scalar product of the vector with the argument
  // Both vectors must have equal dimensionality
  dot: function(v) {
    return (this.x * v.x) + (this.y * v.y) + (this.z * v.z) + (this.t * v.t);
  },

  getAngleTo: function(v) {
    return Math.radToDeg(Math.acos(this.dot(v)));
  },

  // Returns the length ('length') of the vector
  length: function() {
    return Math.sqrt(this.dot(this));
  },
  norm: function() {
    return length();
  },

  lengthSquared: function() {
    return this.dot(this);
  },

  // Normalized this vector and returns the previous length
  normalize: function() {
    var len = this.length();
    if (len === 0) {
      return 0;
    }
    this.mulInPlace(1.0 / len);
    return len;
  },

  // Returns a copy of the vector
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

/**
 * Overloaded Constructor for a vec4
 * @return {object} A preset vec4 for the x axis.
 */
FABRIC.RT.Vec4.xAxis = new FABRIC.RT.Vec4(1, 0, 0, 0);

/**
 * Overloaded Constructor for a vec4
 * @return {object} A preset vec4 for the y axis.
 */
FABRIC.RT.Vec4.yAxis = new FABRIC.RT.Vec4(0, 1, 0, 0);

/**
 * Overloaded Constructor for a vec4
 * @return {object} A preset vec4 for the z axis.
 */
FABRIC.RT.Vec4.zAxis = new FABRIC.RT.Vec4(0, 0, 1, 0);

/**
 * Overloaded Constructor for a vec4
 * @return {object} A preset vec4 for the t axis.
 */
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
