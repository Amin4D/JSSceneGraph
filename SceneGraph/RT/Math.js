
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//

/**
 * The basic math module.
 */
FABRIC.RT = FABRIC.RT ? FABRIC.RT : {};

/**
 * The precision of the math module.
 */
FABRIC.RT.precision = 1e-5;
/**
 * The factor to project radians to degrees.
 */
FABRIC.RT.radToDeg = 57.2957795;
/**
 * The factor to project degrees to radians.
 */
FABRIC.RT.degToRad = 0.0174532925;
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

/**
 * Equals implementation for every number in javascript
 * using our precision specification.
 * @param {number} that The number to compare against.
 * @return {boolean} True if the numbers are equal.
 */
Number.prototype.eql = function(that) {
  return Math.abs(this - that) < FABRIC.RT.precision;
};
