
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//

/**
 * Function to determine if an object is a valid rgba.
 * @param {object} rgba The rgba object to validate.
 * @return {boolean} true if the given object is a valid rgba.
 */
FABRIC.RT.isRGBA = function(rgba) {
  return typeof rgba === 'object' &&
    'r' in rgba &&
    typeof rgba.r === 'number' &&
    'g' in rgba &&
    typeof rgba.g === 'number' &&
    'b' in rgba &&
    typeof rgba.b === 'number' &&
    'a' in rgba &&
    typeof rgba.a === 'number';
};

/**
 * Constructor for a rgba object.
 * @constructor
 * @param {number} r The red component.
 * @param {number} g The green component.
 * @param {number} b The blue  component.
 * @param {number} a The alpha component.
 */
FABRIC.RT.RGBA = function(r, g, b, a) {
  if (typeof r === 'number' && typeof g === 'number' && typeof b === 'number' && typeof a === 'number') {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
  }
  else if (typeof r === 'number' && typeof g === 'number' && typeof b === 'number' && a === undefined) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = 255;
  }
  else if (FABRIC.RT.isRGBA(r) && g === undefined && b === undefined && a === undefined) {
    this.r = r.r;
    this.g = r.g;
    this.b = r.b;
    this.a = r.a;
  }
  else if (r === undefined && g === undefined && b === undefined && a === undefined) {
    this.r = 0;
    this.g = 0;
    this.b = 0;
    this.a = 255;
  }
  else throw'new RGBA: invalid arguments';
  };

FABRIC.RT.RGBA.prototype = {

  clampRGBAValues: function() {
    this.r = parseInt(Math.min(Math.max(this.r, 0), 255));
    this.g = parseInt(Math.min(Math.max(this.g, 0), 255));
    this.b = parseInt(Math.min(Math.max(this.b, 0), 255));
    this.a = parseInt(Math.min(Math.max(this.a, 0), 255));
    return this;
  },

  // Returns the result of adding the argument to the vector
  add: function(rgba) {
    var c = new FABRIC.RT.RGBA(this.r + rgba.r, this.g + rgba.g, this.b + rgba.b, this.a + rgba.a);
    c.clampRGBAValues();
    return c;
  },

  addInPlace: function(rgba) {
    this.r += rgba.r; this.g += rgba.g; this.b += rgba.b; this.a += rgba.a;
    return this.clampRGBAValues();
  },

  subtract: function(rgba) {
    var c = (new FABRIC.RT.RGBA(this.r - rgba.r,
      this.g - rgba.g,
      this.b - rgba.b,
    this.a - rgba.a)).clampRGBAValues();
    c.clampRGBAValues();
    return c;
  },

  subInPlace: function(rgba) {
    this.r -= rgba.r; this.g -= rgba.g; this.b -= rgba.b; this.a -= rgba.a;
    return this.clampRGBAValues();
  },

  multiply: function(rgba) {
    if (typeof rgba == 'number') {
      var c = new FABRIC.RT.RGBA(this.r * rgba, this.g * rgba, this.b * rgba, this.a * rgba);
      return c.clampRGBAValues();
    }else if (isRGBA(rgba)) {
      var c = new FABRIC.RT.RGBA(this.r * rgba.r, this.g * rgba.g, this.b * rgba.b, this.a * rgba.a);
      return c.clampRGBAValues();
    }else {
      log('Incorrect param type for Multiply');
    }
  },

  mulInPlace: function(rgba) {
    if (typeof rgba == 'number') {
      this.r *= rgba; this.g *= rgba; this.b *= rgba; this.a *= rgba;
    }else {
      this.r *= rgba.r; this.g *= rgba.g; this.b *= rgba.b; this.a *= rgba.a;
    }
    this.clampRGBAValues();
    return this;
  },

  interpTowards: function(rgba, weight) {
    var delta = rgba.subtract(this);
    delta.mulInPlace(weight);
    return this.add(delta);
  },

  // Returns true if the vector is equal to the argument
  eql: function(rgba) {
    return (FABRIC.RT.isRGBA(rgba) &&
      (this.r === rgba.r) &&
      (this.g === rgba.g) &&
      (this.b === rgba.b) &&
      (this.a === rgba.a));
  },

  clone: function() {
    return new FABRIC.RT.RGBA(this);
  },

  toString: function() {
    return 'FABRIC.RT.RGBA(' + this.r + ',' + this.g + ',' + this.b + ',' + this.a + ')';
  },

  getType: function() {
    return 'FABRIC.RT.RGBA';
  }
};

FABRIC.appendOnCreateContextCallback(function(context) {
  context.RegisteredTypesManager.registerType('RGBA', {
    members: {
      r: 'Byte', g: 'Byte', b: 'Byte', a: 'Byte'
    },
    constructor: FABRIC.RT.RGBA,
    klBindings: {
      filename: 'RGBA.kl',
      sourceCode: FABRIC.loadResourceURL('FABRIC_ROOT/SceneGraph/RT/RGBA.kl')
    }
  });
});
