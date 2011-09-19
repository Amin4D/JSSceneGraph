
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//

/**
 * Function to determine if an object is a valid vec2.
 * @param {object} vec2 The vec2 object to validate.
 * @return {boolean} true if the given object is a valid vec2.
 */
FABRIC.RT.isVec2 = function(vec2) {
  return typeof vec2 === 'object' &&
    'x' in vec2 &&
    typeof vec2.x === 'number' &&
    'y' in vec2 &&
    typeof vec2.y === 'number';
};

/**
 * Constructor for a vec2 object.
 * @constructor
 * @param {number} x The x component.
 * @param {number} y The y component.
 */
FABRIC.RT.Vec2 = function(x, y) {
  if (typeof x === 'number' && typeof y === 'number') {
    this.x = x;
    this.y = y;
  }
  else if (FABRIC.RT.isVec2(x) && y === undefined) {
    this.x = x.x;
    this.y = x.y;
  }
  else if (x === undefined && y === undefined) {
    this.x = 0;
    this.y = 0;
  }
  else throw'new Vec2: invalid arguments';
  };

/**
 * Overloaded Constructor for a vec2 object.
 * @param {number} x The x component.
 * @param {number} y The y component.
 * @return {object} The created vec2 object.
 */
FABRIC.RT.vec2 = function(x, y) {
  return new FABRIC.RT.Vec2(x, y);
};

FABRIC.RT.Vec2.prototype = {
  set: function(x, y) {
    this.x = x; this.y = y;
    return this;
  },
  // Returns true if the vector is equal to the argument
  eql: function(v) {
    return FABRIC.RT.isVec2(v) &&
      (Math.abs(this.x - v.x) < FABRIC.RT.precision) &&
      (Math.abs(this.y - v.y) < FABRIC.RT.precision);
  },

  scale: function(s) {
    return new FABRIC.RT.Vec2(this.x * s, this.y * s);
  },
  scaleInPlace: function(s) {
    this.x *= s; this.y *= s;
    return this;
  },

  // Returns the result of adding the argument to the vector
  add: function(v) {
    return new FABRIC.RT.Vec2(this.x + v.x, this.y + v.y);
  },

  addInPlace: function(v) {
    this.x += v.x; this.y += v.y;
    return this;
  },

  subtract: function(v) {
    return new FABRIC.RT.Vec2(this.x - v.x, this.y - v.y);
  },

  subInPlace: function(v) {
    this.x -= v.x; this.y -= v.y;
    return this;
  },

  multiply: function(v) {
    if (typeof v == 'number') {
      return new FABRIC.RT.Vec2(this.x * v, this.y * v);
    }else if (FABRIC.RT.isVec2(v)) {
      return new FABRIC.RT.Vec2(this.x * v.x, this.y * v.y);
    }else {
      throw'Incorrect param type for Multiply';
      }
  },

  mulInPlace: function(v) {
    if (typeof v == 'number') {
      this.x *= v; this.y *= v;
    }else if (FABRIC.RT.isVec2(v)) {
      this.x *= v.x; this.y *= v.y;
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
    return new FABRIC.RT.Vec2(-this.x, - this.y);
  },

  negateInPlace: function(v) {
    this.x = - this.x;
    this.y = - this.y;
    return this;
  },

  invert: function(v) {
    return new FABRIC.RT.Vec2(1/this.x, 1/this.y);
  },

  invertInPlace: function(v) {
    this.x = 1/this.x;
    this.y = 1/this.y;
    return this;
  },

  // Returns the scalar product of the vector with the argument
  // Both vectors must have equal dimensionality
  dot: function(v) {
    return (this.x * v.x) + (this.y * v.y);
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
  min: function(minVal) {
    return FABRIC.RT.vec2(Math.min(this.x, minVal.x), Math.min(this.y, minVal.y));
  },
  max: function(maxVal) {
    return FABRIC.RT.vec2(Math.max(this.x, maxVal.x), Math.max(this.y, maxVal.y));
  },
  clamp: function(min, max) {
    return FABRIC.RT.vec2((this.x < (min.x) ? (min.x) : (this.x > (max.x) ? (max.x) : this.x)),
    (this.y < (min.y) ? (min.y) : (this.y > (max.y) ? (max.y) : this.y)));
  },
  insideRect: function(rectTL, rectBR) {
    return (this.x > rectTL.x &&
      this.x < rectBR.x &&
      this.y > rectTL.y &&
      this.y < rectBR.y);
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

/**
 * Overloaded Constructor for a vec2
 * @return {object} A preset vec2 for the x axis.
 */
FABRIC.RT.Vec2.xAxis = new FABRIC.RT.Vec2(1, 0);

/**
 * Overloaded Constructor for a vec2
 * @return {object} A preset vec2 for the y axis.
 */
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
