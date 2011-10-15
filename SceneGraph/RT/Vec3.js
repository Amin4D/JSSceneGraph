
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//

//determine if an object is a valid Vec3.
FABRIC.RT.isVec3 = function(t) {
  return t && t.getType &&
         t.getType() === 'FABRIC.RT.Vec3';
};

//Constructor:
//  Supported args:
//    (none)
//    x, y, z
//    Vec3
FABRIC.RT.Vec3 = function() {
  if (arguments.length == 3 &&
      FABRIC.RT.isScalar(arguments[0]) && 
      FABRIC.RT.isScalar(arguments[1]) && 
      FABRIC.RT.isScalar(arguments[2]) ) {
    this.x = arguments[0];
    this.y = arguments[1];
    this.z = arguments[2];
  }
  else if (arguments.length == 1 && FABRIC.RT.isVec3(arguments[0])) {
    this.x = arguments[0].x;
    this.y = arguments[0].y;
    this.z = arguments[0].z;
  }
  else if (arguments.length == 0) {
    this.x = 0;
    this.y = 0;
    this.z = 0;
  }
  else throw'new Vec3: invalid arguments';
  };

FABRIC.RT.Vec3.prototype = {

  //set: see constructor for supported args
  set: function() {
    FABRIC.RT.Vec3.apply(this, arguments);
    return this;
  },

  setNull: function(x, y, z) {
    this.x = 0; this.y = 0; this.z = 0;
    return this;
  },

  equal: function(v) {
    var result = //JS bug: if the condition is directly returned it is wrong (??)
      this.x === v.x &&
      this.y === v.y &&
      this.z === v.z;
    return result;
  },

  almostEqual: function(v, precision) {
    if (precision === undefined) {
      precision = Math.PRECISION;
    }
    var result = //JS bug: if the condition is directly returned it is wrong (??)
      (Math.abs(this.x - v.x) < precision) &&
      (Math.abs(this.y - v.y) < precision) &&
      (Math.abs(this.z - v.z) < precision);
    return result;
  },

  component: function(i) {
    if(i == 0)
      return this.x;
    else if(i == 1)
      return this.y;
    else
      return this.z;
  },

  setComponent: function(i, v) {
    if(i == 0)
      this.x = v;
    else if(i == 1)
      this.y = v;
    else
      this.z = v;
  },

  // Returns the result of adding the argument to the vector
  add: function(v) {
    return new FABRIC.RT.Vec3(this.x + v.x, this.y + v.y, this.z + v.z);
  },

  subtract: function(v) {
    return new FABRIC.RT.Vec3(this.x - v.x, this.y - v.y, this.z - v.z);
  },

  multiply: function(v) {
    return new FABRIC.RT.Vec3(this.x * v.x, this.y * v.y, this.z * v.z);
  },

  multiplyScalar: function(s) {
    return new FABRIC.RT.Vec3(this.x * s, this.y * s, this.z * s);
  },

  divide: function(v) {
    if( Math.verboseLogFunction ) {
      Math.checkDivisor(v.x, 'Vec3.divide v.x');
      Math.checkDivisor(v.y, 'Vec3.divide v.y');
      Math.checkDivisor(v.z, 'Vec3.divide v.z');
    }
    return new FABRIC.RT.Vec3(this.x / v.x, this.y / v.y, this.z / v.z);
  },

  divideScalar: function(s) {
    Math.checkDivisor(s, 'Vec3.divideScalar');
    return this.multiplyScalar(1.0 / s);
  },

  negate: function() {
    return new FABRIC.RT.Vec3(-this.x, - this.y, - this.z);
  },

  inverse: function() {
    if( Math.verboseLogFunction ) {
      Math.checkDivisor(this.x, 'Vec3.inverse this.x');
      Math.checkDivisor(this.y, 'Vec3.inverse this.y');
      Math.checkDivisor(this.z, 'Vec3.inverse this.z');
    }
    return new FABRIC.RT.Vec3(1.0/this.x, 1.0/this.y, 1.0/this.z);
  },

  dot: function(v) {
    return (this.x * v.x) + (this.y * v.y) + (this.z * v.z);
  },

  cross: function(v) {
    return new FABRIC.RT.Vec3((this.y * v.z) - (this.z * v.y),
      (this.z * v.x) - (this.x * v.z),
    (this.x * v.y) - (this.y * v.x));
  },

  length: function() {
    return Math.sqrt(this.dot(this));
  },

  lengthSquared: function() {
    return this.dot(this);
  },

  // Return a normalized form of this vector
  unit: function() {
    var len = this.length();
    Math.checkDivisor(len, 'Vec3.unit');
    return this.divideScalar(len);
  },

  //Note: setUnit returns the previous length
  setUnit: function() {
    var len = this.length();
    Math.checkDivisor(len, 'Vec3.setUnit');
    var invLen = 1.0 / len;
    this.x *= invLen;
    this.y *= invLen;
    this.z *= invLen;
    return len;
  },

  clamp: function(min, max) {
    return new FABRIC.RT.Vec3(
      (this.x < min.x ? min.x : (this.x > max.x ? max.x : this.x)),
      (this.y < min.y ? min.y : (this.y > max.y ? max.y : this.y)),
      (this.z < min.z ? min.z : (this.z > max.z ? max.z : this.z))
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
    return new FABRIC.RT.Vec3(this.x, this.y, this.z);
  },
  toString: function() {
    return 'FABRIC.RT.Vec3(' + this.x + ',' + this.y + ',' + this.z + ')';
  },
  getType: function() {
    return 'FABRIC.RT.Vec3';
  }
};

//Vec3 constants
FABRIC.RT.Vec3.origin = new FABRIC.RT.Vec3(0, 0, 0);
FABRIC.RT.Vec3.xAxis = new FABRIC.RT.Vec3(1, 0, 0);
FABRIC.RT.Vec3.yAxis = new FABRIC.RT.Vec3(0, 1, 0);
FABRIC.RT.Vec3.zAxis = new FABRIC.RT.Vec3(0, 0, 1);

// distanceFromLineToLine():
//    Input:  two 3D lines L1 and L2
//    Return: the shortest distance between L1 and L2

/**
 * Math function to compute the distance of a
 * line to another line.
 * @param {object} l1_p0 A vec3 object representing the first point of the first line.
 * @param {object} l1_p1 A vec3 object representing the second point of the first line.
 * @param {object} l2_p0 A vec3 object representing the first point of the second line.
 * @param {object} l2_p1 A vec3 object representing the second point of the second line.
 * @return {number} The distance between the lines.
 */
FABRIC.RT.Vec3.distanceFromLineToLine = function(
  l1_p0, l1_p1,
  l2_p0, l2_p1
) {
  var u, v, w, dP;
  var a, b, c, d, e, D;
  var result = {
    l1_t: 0.0, l2_t: 0.0
  };
  u = l1_p1.subtract(l1_p0);
  v = l2_p1.subtract(l2_p0);
  w = l1_p0.subtract(l2_p0);
  a = u.dot(u); // always >= 0
  b = u.dot(v);
  c = v.dot(v); // always >= 0
  d = u.dot(w);
  e = v.dot(w);
  D = a * c - b * b; // always >= 0

  // com_pute the line _parameters of the two closest points
  if (D < 0.001) {
    // the lines are almost parallel
    l1_t = 0.0;
    if (b > c) {
      // use the largest denominator
      result.l2_t = d / b;
    }
    else {
      result.l2_t = e / c;
    }
  }
  else {
    result.l1_t = (b * e - c * d) / D;
    result.l2_t = (a * e - b * d) / D;
  }

  // get the difference of the two closest points
  result.dP = w.add(u.multiplyScalar(result.l1_t).subtract(v.multiplyScalar(result.l2_t)));
  result.dist = result.dP.length();
  return result; // return the closest distance
};

/**
 * Math function to compute the location of a ray intersecting with a plane.
 * @param {object} rayStart A vec3 object representing start of the ray.
 * @param {object} rayDirection A vec3 object representing direction of the ray.
 * @param {object} planePoint A vec3 object representing a point on the plane.
 * @param {object} planeNormal A vec3 object representing normal of the plane.
 * @return {number} The factor for multiplying the rayDirection to reach the intersection,
 * or -1 if there is no intersection.
 */
FABRIC.RT.Vec3.rayIntersectPlane = function(
  rayStart, rayDirection,
  planePoint, planeNormal
) {
  var w, D, N;
  w = rayStart.subtract(planePoint);
  D = planeNormal.dot(rayDirection);
  N = - planeNormal.dot(w);

  if (Math.abs(D) < Math.DIVIDEPRECISION) {
    // segment is parallel to plane
    if (N === 0)// segment lies in plane
      return - 1;
    else
      return - 1; // no intersection
  }
  // they are not parallel
  // compute intersect param
  var sI = N / D;
  if (sI < 0)
    return - 1; // no intersection

  return sI;
};

FABRIC.appendOnCreateContextCallback(function(context) {
  context.RegisteredTypesManager.registerType('Vec3', {
    members: {
      x: 'Scalar', y: 'Scalar', z: 'Scalar'
    },
    constructor: FABRIC.RT.Vec3,
    klBindings: {
      filename: 'Vec3.kl',
      sourceCode: FABRIC.loadResourceURL('FABRIC_ROOT/SceneGraph/RT/Vec3.kl')
    }
  });
});
