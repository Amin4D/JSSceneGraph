
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//

/**
 * The basic math module.
 */
FABRIC.RT = FABRIC.RT ? FABRIC.RT : {};

/**
 * Function to test if a given value is a scalar.
 * @param {value} value The value to validate.
 * @return {boolean} True if the given value is a scalar.
 */
FABRIC.RT.isScalar = function(value) {
  return typeof value === 'number';
};

// Each RT that wants to be persisted should impliment 'toString'
// and here we can easily recreate the object form the string.
/**
 * Function to test if a given value is a string.
 * @param {value} str The string to validate.
 * @return {boolean} True if the given string is a string.
 */
FABRIC.RT.isRTString = function(str) {
  return (str.substring(0, 10) == 'FABRIC.RT');
};
/**
 * Function to evaluate a string to a value.
 * @param {string} str The string to evaluate.
 * @return {value} The evaluated result of the string.
 */
FABRIC.RT.fromString = function(str) {
  // TODO: impliment this method without eval...
  return eval(str);
};



FABRIC.RT.Math = function() {
  this.precision = 1e-5;
  this.PI = 3.141592653589793238462643383279;
  this.radToDeg = 180.0 / this.PI;
  this.degToRad = this.PI / 180.0;
  this.TWO_PI = this.PI * 2.0;
  this.HALF_PI = this.PI * 0.5;
}

FABRIC.RT.Math.prototype = {

  lerpScalar: function() {
    return this.isXZY() || this.isZYX() || this.isYXZ();
  }
};

FABRIC.RT.math = new FABRIC.RT.Math();

FABRIC.appendOnCreateContextCallback(function(context) {
  context.RegisteredTypesManager.registerType('Math', {
    members: {
      precision: 'Scalar',
      radToDeg: 'Scalar',
      degToRad: 'Scalar',
      PI: 'Scalar',
      TWO_PI: 'Scalar',
      HALF_PI: 'Scalar'
    },
    constructor: FABRIC.RT.Math,
    kBindings: FABRIC.loadResourceURL('FABRIC_ROOT/SceneGraph/RT/Math.kl')
  });
});
