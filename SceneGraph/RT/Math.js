
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
Math.DEG_TO_RAD = 57.29577951308232;
Math.RAD_TO_DEG = 0.017453292519943295;
Math.PRECISION = 10e-12;
Math.DIVIDEPRECISION = 10e-200;

/*
 * Convert between radians and degrees
 */
Math.radToDeg = function(val){ return val * Math.RAD_TO_DEG; };
Math.degToRad = function(val){ return val * Math.DEG_TO_RAD; };

Math.clamp = function(val, minval, maxval){
  return (val < minval ? minval : (val > maxval ? maxval : val));
}

Math.linearInterpolate = function (val1, val2, t){
  return val1 + ((val2 - val1) * t);
}

//Math.verboseLogFunction: Set this to a 'log' function such as console.log() to enable verbose

Math.reportWarning = function(desc) {
  if(Math.verboseLogFunction !== undefined) {
    Math.verboseLogFunction("Math.Warning: " + desc);
  }
}

Math.badDivisor = function(s){
  return s < Math.DIVIDEPRECISION && s > -Math.DIVIDEPRECISION;
}

Math.checkDivisor = function(s, contextDesc){
  if(Math.verboseLogFunction !== undefined && Math.badDivisor(s)) {
    Math.reportWarning(contextDesc + ': bad divisor: ' + s);
  }
}

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

