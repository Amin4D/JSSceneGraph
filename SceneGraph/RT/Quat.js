
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//

/**
 * Function to determine if the given object is a quaternion object.
 * @param {object} quat The object to validate.
 * @return {boolean} True if the given object is a valid quaternion.
 */
FABRIC.RT.isQuat = function(quat) {
  return typeof quat === 'object' &&
    'v' in quat &&
    FABRIC.RT.isVec3(quat.v) &&
    'w' in quat &&
    typeof quat.w === 'number';
};

/**
 * Constructor for a quaternion object.
 * @constructor
 * @param {number} x The x component of the quaternion.
 * @param {number} y The y component of the quaternion.
 * @param {number} z The z component of the quaternion.
 * @param {number} w The w component of the quaternion.
 */
FABRIC.RT.Quat = function(x, y, z, w) {
  if (typeof x === 'number' && typeof y === 'number' && typeof z === 'number' && typeof w === 'number') {
    this.v = new FABRIC.RT.Vec3(x, y, z);
    this.w = w;
  }
  else if (typeof x === 'number' && FABRIC.RT.isVec3(y) && z === undefined && w === undefined) {
    this.v = y.clone();
    this.w = x;
  }
  else if (FABRIC.RT.isVec3(x) && typeof y === 'number' && z === undefined && w === undefined) {
    var q = FABRIC.RT.Quat.makeFromAxisAndAngle(x, y);
    this.v = q.v.clone();
    this.w = q.w;
  }
  else if (FABRIC.RT.isQuat(x) && y === undefined && z === undefined && w === undefined) {
    this.v = new FABRIC.RT.Vec3(x.v);
    this.w = x.w;
  }
  else if (x === undefined && y === undefined && z === undefined && w === undefined) {
    this.v = new FABRIC.RT.Vec3;
    this.w = 1;
  }
  else throw'Quat constructor: invalid arguments';
  };

/**
 * Overloaded Constructor for a quaternion object.
 * @param {number} x The x component of the quaternion.
 * @param {number} y The y component of the quaternion.
 * @param {number} z The z component of the quaternion.
 * @param {number} w The w component of the quaternion.
 * @return {object} The created quaternion object.
 */
FABRIC.RT.quat = function(x, y, z, w) {
  return new FABRIC.RT.Quat(x, y, z, w);
};

/**
 * Conversion function to create a quaternion from
 * a given axis and angle defining a rotation.
 * @param {object} vec A Vec3 object defining the axis.
 * @param {number} degrees The rotation around the axis in degrees.
 * @return {object} The converted quaternion object.
 */
FABRIC.RT.Quat.makeFromAxisAndAngle = function(vec, degrees) {
  var halfAngle = (degrees * Math.PI / 180.0) / 2.0;

  var q = new FABRIC.RT.Quat();
  q.w = Math.cos(halfAngle);
  q.v = vec.unit();
  q.v.mulInPlace(Math.sin(halfAngle));
  return q;
};

// NB. Function taken from the 'Game Programming Gems' article 'The Shortest Arc Quat' by Stan Melax
// NB. Both vectors must be normalized.

/**
 * Conversion function to create a quaternion from
 * a source and target vector.
 * @param {object} vec1 A Vec3 object defining the source direction.
 * @param {object} vec2 A Vec3 object defining the target direction.
 * @return {object} The converted quaternion object.
 */
FABRIC.RT.Quat.makeFrom2Vectors = function (vec1, vec2, arbitraryIfAmbiguous) {
  var q = new FABRIC.RT.Quat();
  var val = vec1.dot(vec2) + 1;
  if (val <= Math.PRECISION) {
    // the vectors pointed in opposite directions OR they are not unit vectors.
    // creating the quaterion is ambiguous (many answers)
    if (arbitraryIfAmbiguous === true) {
      //Take any orthogonal vector as an intermediate step
      var ortho = new FABRIC.RT.Vec3(vec1.y, vec1.z, vec1.x).cross(vec1).unit();
      //Important: arbitraryIfAmbiguous !== true, else it could recurse infinitely if vec1 or vec2 was (0,0,0)
      return FABRIC.RT.Quat.makeFrom2Vectors(vec1, ortho).multiply(FABRIC.RT.Quat.makeFrom2Vectors(ortho, vec2));
    }
    return q;
  }
  val = Math.sqrt(val * 2);
  q.v = vec1.cross(vec2).divInPlace(val);
  q.w = val / 2;
  return q;
};

/**
 * Math function to interpolate between two quaternions
 * using Nlerp.
 * @param {object} q1 The first quaternion object.
 * @param {object} q2 The second quaternion object.
 * @param {number} t The blend factor for the Nlerp.
 * @return {object} The converted quaternion object.
 */
FABRIC.RT.Quat.makeNlerp = function(q1, q2, t) {
  var q = new FABRIC.RT.Quat();
  var angle = q1.dot(q2);
  if (angle < 0.0) {
    q2.v.negateInPlace();
    q2.w *= - 1.0;
  }
  var p1 = 1.0 - t;
  q.v = q1.v.multiply(p1) + q2.v.multiply(t);
  q.w = (q1.w * p1) + (q2.w * t);
  q.normalize();
  return q;
};

/**
 * Math function to interpolate between two quaternions
 * using Slerp.
 * @param {object} q1 The first quaternion object.
 * @param {object} q2 The second quaternion object.
 * @param {number} t The blend factor for the Slerp.
 * @return {object} The converted quaternion object.
 */
FABRIC.RT.Quat.makeSlerp = function(q1, q2, t) {
  var q = new FABRIC.RT.Quat();
  var angle = q1.dot(q2);
  if (angle < 0.0) {
    q1 *= - 1.0;
    angle *= - 1.0;
  }

  var scale;
  var invscale;

  if ((angle + 1.0) > 0.05) {
    if ((1.0 - angle) >= 0.05)// spherical interpolation
    {
      var theta = acos(angle);
      var invsintheta = 1.0 / (Math.sin(theta));
      scale = Math.sin(theta * (1.0 - t)) * invsintheta;
      invscale = Math.sin(theta * t) * invsintheta;
    }
    else // linear interploation
    {
      scale = 1.0 - t;
      invscale = t;
    }
  }
  else {
    q2.set(-q1.v.y, q1.v.x, - q1.w, q1.v.z);
    scale = Math.sin(Math.PI * (0.5 - t));
    invscale = Math.sin(Math.PI * t);
  }
  q = q1.multiply(scale).addInPlace(q2.multiply(invscale));
  return q;
};

FABRIC.RT.Quat.prototype = {
  set: function(w, vec) {
    this.v = vec.clone();
    this.w = w;
    return this;
  },

  // Returns true if the vector is equal to the argument
  eql: function(q) {
    return (FABRIC.RT.isQuat(q) &&
      (this.v.eql(q.v)) &&
      (Math.abs(this.w - q.w) < Math.PRECISION));
  },

  // Returns the result of adding the argument to the qector
  add: function(q) {
    return new FABRIC.RT.Quat(this.w + q.w, this.v.add(q.v));
  },

  // Quat self referenced addition.
  addInPlace: function(q) {
    this.v.addInPlace(q.v);
    this.w += q.w;
    return this;
  },

  subtract: function(q) {
    return new FABRIC.RT.Quat(this.w - q.w, this.v.subInPlace(q.v));
  },

  // Quat self referenced subtraction.
  subInPlace: function(q) {
    this.v = this.v.subtract(q.v);
    this.w -= q.w;
    return this;
  },

  // Multiply on the left hand side of this Quat
  preMultiply: function(gq) {
    return new FABRIC.RT.Quat(this.w * gq.w - this.v.dot(gq.v),
      gq.v.scale(this.w)
      .addInPlace(this.v.scale(gq.w))
      .addInPlace(this.v.cross(gq.v)));
  },
  preMultiplyInPlace: function(gq) {
    var tmp = this.preMultiply(gq);
    this.set(tmp.w, tmp.v);
    return this;
  },

  // Multiply on the right hand side of this Quat
  postMultiply: function(gq) {
    return gq.preMultiply(this);
  },

  postMultiplyInPlace: function(gq) {
    var tmp = gq.preMultiply(this);
    this.set(tmp.w, tmp.v);
    return this;
  },

  // Quat multiplication.
  multiply: function(v) {
    if (typeof v == 'number') {
      return new FABRIC.RT.Quat(this.w * v, this.v.multiply(v));
    }else if (FABRIC.RT.isQuat(v)) {
      return this.postMultiply(v);
    }else {
      throw'Incorrect param type for Multiply';
      }
  },

  // Quat self referenced multiplication.
  // Note: there must be a bug here....
  // 'multiply' uses postMultiply for quaternion multiplication
  // but 'mulInPlace' uses 'preMultiplyInPlace'. one of these must be wrong.
  mulInPlace: function(v) {
    if (typeof v == 'number') {
      this.v.mulInPlace(v);
      this.w *= v;
    }else {
      this.preMultiplyInPlace(v);
    }
    return this;
  },

  // Quat division
  divide: function(v) {
    return this.multiply(1.0 / v);
  },

  // Quat self referenced division.
  divInPlace: function(v) {
    return this.mulInPlace(1.0 / v);
  },

  // Quat dot product.
  dot: function(gq) {
    return (this.w * gq.w + this.v.dot(gq.v));
  },

  // Quat cross product.
  cross: function(gq) {
    return new FABRIC.RT.Quat(this.w * gq.w - this.v.dot(gq.v),
      (gq.v.scale(this.w)).addInPlace(this.v.scale(gq.w))
    .addInPlace(this.v.cross(gq.v)));
  },

  // Quat complex conjugate.
  conjugate: function() {
    return new FABRIC.RT.Quat(this.w, this.v.negate());
  },

  // Quat self referenced complex conjugate.
  conjugateInPlace: function() {
    this.v.negateInPlace();
    return this;
  },

  // Quat complex conjugate.
  invert: function(gq) {
    var norm = this.norm();
    norm = norm == 0.0 ? 1.0 : norm;
    return this.divide(norm).conjugate();
  },

  // Quat self referenced complex conjugate.
  invertInPlace: function(gq) {
    var norm = this.norm();
    norm = norm == 0.0 ? 1.0 : norm;
    this.divInPlace(norm);
    this.conjugateInPlace();
    return this;
  },

  // Quat norm (similar to vector length).
  normSq: function() {
    return this.w * this.w + this.v.lengthSquared();
  },

  // Quat norm (similar to vector length).
  norm: function() {
    return Math.sqrt(this.normSq());
  },

  // Normalized this quaterion
  normalize: function() {
    var norm = this.norm();
    if (norm === 0) {
      return this;
    }
    this.divInPlace(norm);
    return this;
  },

  normalise: function() {
    return normalize();
  },

  // GLVector interface method for ease of use. THIS IS PROBABLY THE ONLY METHOD YOU WOULD NORMALLY USE.
  // NB. Don't forget to normalise the quaternion unless you want axial translation as well as rotation.
  rotateVector: function(gv) {
    var temp = new FABRIC.RT.Quat(0, gv);
    temp = this.cross(temp);
    temp.mulInPlace(this.conjugate());
    return temp.v;
  },

  // Method for obtaining axes directly from a quaternion
  getXaxis: function() {
    var temp = FABRIC.RT.vec3();
    var xy = this.v.x * this.v.y; var xz = this.v.x * this.v.z;
    var yy = this.v.y * this.v.y; var yw = this.v.y * this.w;
    var zz = this.v.z * this.v.z; var zw = this.v.z * this.w;

    temp.x = 1 - 2 * (zz + yy);
    temp.y = 2 * (xy + zw);
    temp.z = 2 * (xz - yw);
    return temp;
  },
  getYaxis: function() {
    var temp = FABRIC.RT.vec3();
    var xx = this.v.x * this.v.x; var xy = this.v.x * this.v.y; var xw = this.v.x * this.w;
    var yz = this.v.y * this.v.z;
    var zz = this.v.z * this.v.z; var zw = this.v.z * this.w;

    temp.x = 2 * (xy - zw);
    temp.y = 1 - 2 * (zz + xx);
    temp.z = 2 * (yz + xw);
    return temp;
  },
  getZaxis: function() {
    var temp = FABRIC.RT.vec3();
    var xx = this.v.x * this.v.x; var xz = this.v.x * this.v.z; var xw = this.v.x * this.w;
    var yy = this.v.y * this.v.y; var yz = this.v.y * this.v.z; var yw = this.v.y * this.w;

    temp.x = 2 * (yw + xz);
    temp.y = 2 * (yz - xw);
    temp.z = 1 - 2 * (yy + xx);
    return temp;
  },
  
  setFromMat33: function(m, ro) {
    if (!FABRIC.RT.isMat33(m))
      throw'Invalid matrix object for setFromMat33';

    if (!FABRIC.RT.isRotationOrder(ro))
      ro = new FABRIC.RT.RotationOrder();

    var row0 = m.row0;
    var row1 = m.row1;
    var row2 = m.row2;

    // Grab the X scale and normalize the first row
    row0.normalize();

    // Make the 2nd row orthogonal to the 1st
    row1.subInPlace(row0.multiply(row0.dot(row1)));

    // Grab the Y scale and normalize the 2nd row
    row1.normalize();

    // Make the 3rd row orthogonal to the 1st and 2nd
    row2.subInPlace(row0.multiply(row0.dot(row2)));
    row2.subInPlace(row1.multiply(row1.dot(row2)));

    // Gnormalize the 2nd row
    row2.normalize();

    var rot = new FABRIC.RT.Vec3();
    if (ro.isXYZ()) {
      rot.y = Math.asin(row0.z);
      if (Math.abs(row0.z) > 0.9995) {
        rot.x = Math.atan2(row2.y, row1.y);
        rot.y = (row0.z < 0.0 ? - rot.y : rot.y);
        rot.z = 0.0;
      }
      else {
        rot.x = Math.atan2(-row1.z, row2.z);
        rot.z = Math.atan2(-row0.y, row0.x);
      }
    }
    else {
      throw'Xfo.setFromMat44 only implemented for XYZ rotation order';
    }

    var e = new FABRIC.RT.Euler(rot, ro);
    var q = e.toQuat();
    this.w = q.w;
    this.v = q.v;
  },
  
  makeMatrix: function() {
    var temp = new FABRIC.RT.Mat33();

    var xx = this.v.x * this.v.x;
    var xy = this.v.x * this.v.y;
    var xz = this.v.x * this.v.z;
    var xw = this.v.x * this.w;
    var yy = this.v.y * this.v.y;
    var yz = this.v.y * this.v.z;
    var yw = this.v.y * this.w;
    var zz = this.v.z * this.v.z;
    var zw = this.v.z * this.w;

    temp.row0.x = 1.0 - 2.0 * (zz + yy);
    temp.row1.x = 2.0 * (xy + zw);
    temp.row2.x = 2.0 * (xz - yw);

    temp.row0.y = 2.0 * (xy - zw);
    temp.row1.y = 1.0 - 2.0 * (zz + xx);
    temp.row2.y = 2.0 * (yz + xw);

    temp.row0.z = 2.0 * (yw + xz);
    temp.row1.z = 2.0 * (yz - xw);
    temp.row2.z = 1.0 - 2.0 * (yy + xx);

    return temp;
  },

  mirror: function(axis) {
    var tempW = this.w;
    switch (axis) {
      case 0: this.w = this.v.y; this.v.set(this.v.z, tempW, this.v.x); break;
      case 1: this.w = - this.v.x; this.v.set(-tempW, this.v.z, this.v.y); break;
      case 2: this.w = - this.w; this.v.set(this.v.x, this.v.y, - this.v.z); break;
    }
  },

  // Returns a copy of the quaternion
  clone: function() {
    return new FABRIC.RT.Quat(this.w, this.v.clone());
  },

  toString: function() {
    return 'FABRIC.RT.quat({' + this.v.x + ',' + this.v.y + ',' + this.v.z + '},' + this.w + ')';
  },

  getType: function() {
    return 'FABRIC.RT.Quat';
  },
  displayGUI: function($parentDiv, changeHandlerFn) {
    var val = this;
    var fn = function() {
      changeHandlerFn(val);
    }
    var vecRefreshFn = this.v.displayGUI($parentDiv, fn, 22);
    var $wWidget = $('<input type="number" style="width: 20%" value="' + this.w + '"/>').bind(
      'change', function(event, ui) {
        val.w = parseFloat($(this).val()); fn();
    });

    $parentDiv.append($wWidget);
    var hdler = function(val) {
      vecRefreshFn(val.v);
      $wWidget.val(val.w);
    };
    return hdler;
  }
};

FABRIC.appendOnCreateContextCallback(function(context) {
  context.RegisteredTypesManager.registerType('Quat', {
    members: {
      v: 'Vec3', w: 'Scalar'
    },
    constructor: FABRIC.RT.Quat,
    klBindings: {
      filename: 'Quat.kl',
      sourceCode: FABRIC.loadResourceURL('FABRIC_ROOT/SceneGraph/RT/Quat.kl')
    }
  });
});
