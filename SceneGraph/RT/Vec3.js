
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//

/**
 * Function to determine if an object is a valid vec3.
 * @param {object} vec3 The vec3 object to validate.
 * @return {boolean} true if the given object is a valid vec3.
 */
FABRIC.RT.isVec3 = function(vec3) {
  return typeof vec3 === 'object' &&
    'x' in vec3 &&
    typeof vec3.x === 'number' &&
    'y' in vec3 &&
    typeof vec3.y === 'number' &&
    'z' in vec3 &&
    typeof vec3.z === 'number';
};

/**
 * Constructor for a vec3 object.
 * @constructor
 * @param {number} x The x component.
 * @param {number} y The y component.
 * @param {number} z The z component.
 */
FABRIC.RT.Vec3 = function(x, y, z) {
  if (typeof x === 'number' && typeof y === 'number' && typeof z === 'number') {
    this.x = x;
    this.y = y;
    this.z = z;
  }
  else if (FABRIC.RT.isVec3(x) && y === undefined && z === undefined) {
    this.x = x.x;
    this.y = x.y;
    this.z = x.z;
  }
  else if (x === undefined && y === undefined && z === undefined) {
    this.x = 0;
    this.y = 0;
    this.z = 0;
  }
  else throw'new Vec3: invalid arguments';
  };

/**
 * Overloaded Constructor for a vec3 object.
 * @param {number} x The x component.
 * @param {number} y The y component.
 * @param {number} z The z component.
 * @return {object} The created vec3 object.
 */
FABRIC.RT.vec3 = function(x, y, z) {
  return new FABRIC.RT.Vec3(x, y, z);
};

FABRIC.RT.Vec3.prototype = {
  set: function(x, y, z) {
    this.x = x; this.y = y; this.z = z;
    return this;
  },
  // Returns true if the vector is equal to the argument
  eql: function(v) {
    return (FABRIC.RT.isVec3(v) &&
      (Math.abs(this.x - v.x) < Math.PRECISION) &&
      (Math.abs(this.y - v.y) < Math.PRECISION) &&
      (Math.abs(this.z - v.z) < Math.PRECISION));
  },

  scale: function(s) {
    return new FABRIC.RT.Vec3(this.x * s, this.y * s, this.z * s);
  },
  scaleInPlace: function(s) {
    this.x *= s; this.y *= s; this.z *= s;
    return this;
  },

  // Returns the result of adding the argument to the vector
  add: function(v) {
    return new FABRIC.RT.Vec3(this.x + v.x, this.y + v.y, this.z + v.z);
  },

  addInPlace: function(v) {
    this.x += v.x; this.y += v.y; this.z += v.z;
    return this;
  },

  subtract: function(v) {
    return new FABRIC.RT.Vec3(this.x - v.x, this.y - v.y, this.z - v.z);
  },

  subInPlace: function(v) {
    this.x -= v.x; this.y -= v.y; this.z -= v.z;
    return this;
  },

  multiply: function(v) {
    if (typeof v == 'number') {
      return new FABRIC.RT.Vec3(this.x * v, this.y * v, this.z * v);
    }
    else if (FABRIC.RT.isVec3(v)) {
      return new FABRIC.RT.Vec3(this.x * v.x, this.y * v.y, this.z * v.z);
    }
    else {
      throw'Incorrect param type for Multiply';
      }
  },

  mulInPlace: function(v) {
    if (typeof v == 'number') {
      this.x *= v; this.y *= v; this.z *= v;
    }
    else if (FABRIC.RT.isVec3(v)) {
      this.x *= v.x; this.y *= v.y; this.z *= v.z;
    }
    else {
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
    return new FABRIC.RT.Vec3(-this.x, - this.y, - this.z);
  },

  negateInPlace: function(v) {
    this.x = - this.x;
    this.y = - this.y;
    this.z = - this.z;
  },

  invert: function(v) {
    return new FABRIC.RT.Vec3(
      this.x == 0.0 ? 0.0 : 1.0 / this.x,
      this.y == 0.0 ? 0.0 : 1.0 / this.y,
      this.z == 0.0 ? 0.0 : 1.0 / this.z
    );
  },

  invertInPlace: function(v) {
    this.x == 0.0 ? 0.0 : 1.0 / this.x,
    this.y == 0.0 ? 0.0 : 1.0 / this.y,
    this.z == 0.0 ? 0.0 : 1.0 / this.z;
  },

  absolute: function(v) {
    return new FABRIC.RT.Vec3(
      this.x < 0.0 ? - this.x : this.x,
      this.y < 0.0 ? - this.y : this.y,
      this.z < 0.0 ? - this.z : this.z
    );
  },

  absoluteInPlace: function(v) {
    this.x < 0.0 ? - this.x : this.x;
    this.y < 0.0 ? - this.y : this.y;
    this.z < 0.0 ? - this.z : this.z;
  },

  // Returns the scalar product of the vector with the argument
  // Both vectors must have equal dimensionality
  dot: function(v) {
    return (this.x * v.x) + (this.y * v.y) + (this.z * v.z);
  },

  cross: function(v) {
    return new FABRIC.RT.Vec3((this.y * v.z) - (this.z * v.y),
      (this.z * v.x) - (this.x * v.z),
    (this.x * v.y) - (this.y * v.x));
  },

  getAngleTo: function(v) {
    var acosAngle = this.unit().dot(v.unit());
    return Math.radToDeg(Math.acos(Math.min(Math.max(acosAngle,-1.0), 1.0)));
  },
  dist: function(other) {
    return this.subtract(other).length();
  },

  length: function() {
    return Math.sqrt(this.dot(this));
  },
  norm: function() {
    return this.length();
  },

  lengthSquared: function() {
    return this.dot(this);
  },

  // Return a normalized form of this vector
  unit: function() {
    return this.divide(this.length());
  },

  setUnit: function() {
    this.divInPlace(this.length());
    return this;
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
    return new FABRIC.RT.Vec3(this.x, this.y, this.z);
  },
  toString: function() {
    return 'FABRIC.RT.vec3(' + this.x + ',' + this.y + ',' + this.z + ')';
  },
  getType: function() {
    return 'FABRIC.RT.Vec3';
  }
};

/**
 * Overloaded Constructor for a vec3
 * @return {object} A preset vec3 for the origin.
 */
FABRIC.RT.Vec3.origin = new FABRIC.RT.Vec3(0, 0, 0);

/**
 * Overloaded Constructor for a vec3
 * @return {object} A preset vec3 for the x axis.
 */
FABRIC.RT.Vec3.xAxis = new FABRIC.RT.Vec3(1, 0, 0);

/**
 * Overloaded Constructor for a vec3
 * @return {object} A preset vec3 for the y axis.
 */
FABRIC.RT.Vec3.yAxis = new FABRIC.RT.Vec3(0, 1, 0);

/**
 * Overloaded Constructor for a vec3
 * @return {object} A preset vec3 for the z axis.
 */
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
  result.dP = w.add(u.scale(result.l1_t).subtract(v.scale(result.l2_t)));
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

  if (Math.abs(D) < Math.PRECISION) {
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
