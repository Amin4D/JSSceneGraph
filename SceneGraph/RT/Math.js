
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//

/**
 * The basic math module.
 */
FABRIC.RT = FABRIC.RT ? FABRIC.RT : {};

Math.TWO_PI = Math.PI * 2.0;
Math.HALF_PI = Math.PI / 2.0;
Math.QUATER_PI = Math.PI / 4.0;

/**
 * The precision of the math module.
 */
Math.PRECISION = 10e-30
/**
 * The factor to project radians to degrees.
 */
Math.radToDeg = function(val){ return val * (180.0 / Math.PI); };
/**
 * The factor to project degrees to radians.
 */
Math.degToRad = function(val){ return val * (Math.PI / 180.0); };
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
}

FABRIC.appendOnCreateContextCallback(function(context) {
  context.RegisteredTypesManager.registerType('Math', {
    members: {
    },
    constructor: FABRIC.RT.Math,
    klBindings: {
      filename: 'Math.kl',
      sourceCode: FABRIC.loadResourceURL('FABRIC_ROOT/SceneGraph/RT/Math.kl')
    }
  });
});

