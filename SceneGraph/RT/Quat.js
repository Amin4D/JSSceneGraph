
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//

//determine if an object is a valid RotationOrder.
FABRIC.RT.isQuat = function(t) {
  return t && t.getType &&
         t.getType() === 'FABRIC.RT.Quat';
};

//Constructor:
//  Supported args:
//    (none)
//    x, y, z, w
//    w, Vec3
//    Vec3, w
//    Quat
FABRIC.RT.Quat = function() {
  if (arguments.length == 4 &&
      FABRIC.RT.isScalar(arguments[0]) && 
      FABRIC.RT.isScalar(arguments[1]) && 
      FABRIC.RT.isScalar(arguments[2]) && 
      FABRIC.RT.isScalar(arguments[3]) ) {
    this.v = new FABRIC.RT.Vec3(arguments[0], arguments[1], arguments[2]);
    this.w = arguments[3];
  }
  else if (arguments.length == 2 &&
      FABRIC.RT.isScalar(arguments[0]) && 
      FABRIC.RT.isVec3(arguments[1]) ) {
    this.v = arguments[1].clone();
    this.w = arguments[0];
  }
  else if (arguments.length == 2 &&
      FABRIC.RT.isVec3(arguments[0]) && 
      FABRIC.RT.isScalar(arguments[1]) ) {
    this.v = arguments[0].clone();
    this.w = arguments[1];
  }
  else if (arguments.length == 1 && FABRIC.RT.isQuat(arguments[0])) {
    this.v = arguments[0].v.clone();
    this.w = arguments[0].w;
  }
  else if (arguments.length == 0) {
    this.v = new FABRIC.RT.Vec3(0.0,0.0,0.0);
    this.w = 1.0;
  }
  else throw'Quat constructor: invalid arguments';
};

FABRIC.RT.Quat.prototype = {

  //set: see constructor for supported args
  set: function() {
    FABRIC.RT.Quat.apply(this, arguments);
    return this;
  },

  setIdentity: function(){
    this.set();
    return this;
  },

  setFromEuler: function(e) {
    var ordered = new FABRIC.RT.Vec3();
    if (e.ro.isZYX()) {
      ordered.set(e.z,e.y,e.x);
    }
    else if (e.ro.isXZY()) {
      ordered.set(e.x,e.z,e.y);
    }
    else if (e.ro.isYXZ()) {
      ordered.set(e.y,e.x,e.z);
    }
    else if (e.ro.isYZX()) {
      ordered.set(e.y,e.z,e.x);
    }
    else if (e.ro.isXYZ()) {
      ordered.set(e.x,e.y,e.z);
    }
    else if (e.ro.isZXY()) {
      ordered.set(e.z,e.x,e.y);
    }

    var ti, tj, tk;
    ti = (ordered.x * 0.5);
    tj = (e.ro.isReversed() ? - ordered.y * 0.5 : ordered.y * 0.5);
    tk = (ordered.z * 0.5);
    var ci = Math.cos(ti), cj = Math.cos(tj), ck = Math.cos(tk);
    var si = Math.sin(ti), sj = Math.sin(tj), sk = Math.sin(tk);
    var cc = ci * ck, cs = ci * sk, sc = si * ck, ss = si * sk;
    var ai, aj, ak;
    ai = cj * sc - sj * cs;
    aj = cj * ss + sj * cc;
    ak = cj * cs - sj * sc;
    if (e.ro.isReversed())
      aj = - aj;
    this.w = cj * cc + sj * ss;

    if (e.ro.isZYX()) {
      this.v.x = ak; this.v.y = aj; this.v.z = ai;
    }
    else if (e.ro.isXZY()) {
      this.v.x = ai; this.v.y = ak; this.v.z = aj;
    }
    else if (e.ro.isYXZ()) {
      this.v.x = aj; this.v.y = ai; this.v.z = ak;
    }
    else if (e.ro.isYZX()) {
      this.v.x = ak; this.v.y = ai; this.v.z = aj;
    }
    else if (e.ro.isXYZ()) {
      this.v.x = ai; this.v.y = aj; this.v.z = ak;
    }
    else if (e.ro.isZXY()) {
      this.v.x = aj; this.v.y = ak; this.v.z = ai;
    }
    return this;
  },

  setFromAxisAndAngle: function(vec, radians) {
    var halfAngle = radians / 2.0;

    this.w = Math.cos(halfAngle);
    this.v = vec.unit().multiplyScalar(Math.sin(halfAngle));
    return this;
  },

  setFromMat33: function(mat) {
    var trace = mat.row0.x + mat.row1.y + mat.row2.z;
    if (trace > 0) {
      var s = 2.0 * Math.sqrt(trace + 1.0);
      this.w = 0.25 * s;
      Math.checkDivisor(s, 'Quat.setFromMat33');
      var invS = 1.0 / s;
      this.v.x = (mat.row2.y - mat.row1.z) * invS;
      this.v.y = (mat.row0.z - mat.row2.x) * invS;
      this.v.z = (mat.row1.x - mat.row0.y) * invS;
    }else if (mat.row0.x > mat.row1.y && mat.row0.x > mat.row2.z) {
      var s = 2.0 * Math.sqrt(1.0 + mat.row0.x - mat.row1.y - mat.row2.z);
      Math.checkDivisor(s, 'Quat.setFromMat33');
      var invS = 1.0 / s;
      this.w = (mat.row2.y - mat.row1.z) * invS;
      this.v.x = 0.25 * s;
      this.v.y = (mat.row0.y + mat.row1.x) * invS;
      this.v.z = (mat.row0.z + mat.row2.x) * invS;
    }else if (mat.row1.y > mat.row2.z) {
      var s = 2.0 * Math.sqrt(1.0 + mat.row1.y - mat.row0.x - mat.row2.z);
      Math.checkDivisor(s, 'Quat.setFromMat33');
      var invS = 1.0 / s;
      this.w = (mat.row0.z - mat.row2.x) * invS;
      this.v.x = (mat.row0.y + mat.row1.x) * invS;
      this.v.y = 0.25 * s;
      this.v.z = (mat.row1.z + mat.row2.y) * invS;
    }else {
      var s = 2.0 * Math.sqrt(1.0 + mat.row2.z - mat.row0.x - mat.row1.y);
      Math.checkDivisor(s, 'Quat.setFromMat33');
      var invS = 1.0 / s;
      this.w = (mat.row1.x - mat.row0.y) * invS;
      this.v.x = (mat.row0.z + mat.row2.x) * invS;
      this.v.y = (mat.row1.z + mat.row2.y) * invS;
      this.v.z = 0.25 * s;
    }
    this.setUnit();
    return this;
  },

  // NB. Function taken from the 'Game Programming Gems' article 'The Shortest Arc Quat' by Stan Melax
  // NB. Both vectors must be units.
  setFrom2Vectors: function (sourceDirVec, destDirVec, arbitraryIfAmbiguous) {
    var val = sourceDirVec.dot(destDirVec) + 1;
    if( val > 0.0 )
      val = Math.sqrt(val * 2);
    if (val <= Math.DIVIDEPRECISION) {
      if(arbitraryIfAmbiguous === true) {
        // the vectors pointed in opposite directions OR they are not unit vectors.
        // creating the quaterion is ambiguous (many answers)
        //Take any orthogonal vector as an intermediate step
        var ortho = new FABRIC.RT.Vec3(sourceDirVec.y, sourceDirVec.z, sourceDirVec.x).cross(sourceDirVec).unit();
        //Important: arbitraryIfAmbiguous !== true, else it could recurse infinitely if sourceDirVec or destDirVec was (0,0,0)
        var q1 = new FABRIC.RT.Quat(), q2 = new FABRIC.RT.Quat();
        q1.setFrom2Vectors(sourceDirVec, ortho);
        q2.setFrom2Vectors(ortho, destDirVec);
        this.set(q1.multiply(q2));
        return;
      }
      Math.reportWarning('Quat.setFrom2Vectors: bad divisor (ambiguous answer)');
    }
    this.v = sourceDirVec.cross(destDirVec).divideScalar(val);
    this.w = val / 2;
    return this;
  },

  equal: function(q) {
    var result = //JS bug: if the condition is directly returned it is wrong (??)
      this.v.equal(q.v) &&
      this.w === q.w;
    return result;
  },

  almostEqual: function(q, precision) {
    if (precision === undefined) {
      precision = Math.PRECISION;
    }
    var result = //JS bug: if the condition is directly returned it is wrong (??)
      this.v.almostEqual(q.v, precision) &&
      (Math.abs(this.w - q.w) < precision);
    return result;
  },

  add: function(q) {
    return new FABRIC.RT.Quat(this.w + q.w, this.v.add(q.v));
  },

  subtract: function(q) {
    return new FABRIC.RT.Quat(this.w - q.w, this.v.subtract(q.v));
  },

  multiply: function(q) {
    return new FABRIC.RT.Quat(this.w * q.w - this.v.dot(q.v),
      q.v.multiplyScalar(this.w)
      .add(this.v.multiplyScalar(q.w))
      .add(this.v.cross(q.v)));
  },

  multiplyScalar: function(s) {
    return new FABRIC.RT.Quat(this.w * s, this.v.multiplyScalar(s));
  },

  divide: function(b) {
    return new FABRIC.RT.Quat(this.w * b.w + this.v.dot(b.v), (this.v.multiplyScalar(b.w)).subtract(b.v.multiplyScalar(this.w)).subtract(this.v.cross(b.v)));
  },

  divideScalar: function(s) {
    Math.checkDivisor(s, 'Vec4.divideScalar');
    return this.multiplyScalar(1.0 / s);
  },

  // NB. Don't forget to normalise the quaternion unless you want axial translation as well as rotation.
  rotateVector: function(gv) {
    var temp = new FABRIC.RT.Quat(0, gv);
    temp = this.multiply(temp).multiply(this.conjugate());
    return temp.v;
  },

  dot: function(gq) {
    return (this.w * gq.w + this.v.dot(gq.v));
  },

  conjugate: function() {
    return new FABRIC.RT.Quat(this.w, this.v.negate());
  },

  lengthSquared: function() {
    return this.w * this.w + this.v.lengthSquared();
  },

  length: function() {
    return Math.sqrt(this.lengthSquared());
  },

  unit: function() {
    var len = this.length();
    Math.checkDivisor(len, 'Quat.unit');
    return this.divideScalar(len);
  },

  //Note: setUnit returns the previous length
  setUnit: function() {
    var len = this.length();
    Math.checkDivisor(len, 'Quat.setUnit');
    var invLen = 1.0 / len;
    this.w *= invLen;
    this.v = this.v.multiplyScalar(invLen);
    return len;
  },

  inverse: function() {
    return this.unit().conjugate();
  },

  alignWith: function (other) {
    if(this.dot(other) < 0.0){
      this.w = -this.w;
      this.v = this.v.negate();
    }
  },

  getXaxis: function() {
    var temp = new FABRIC.RT.Vec3();
    var xy = this.v.x * this.v.y; var xz = this.v.x * this.v.z;
    var yy = this.v.y * this.v.y; var yw = this.v.y * this.w;
    var zz = this.v.z * this.v.z; var zw = this.v.z * this.w;

    temp.x = 1 - 2 * (zz + yy);
    temp.y = 2 * (xy + zw);
    temp.z = 2 * (xz - yw);
    return temp;
  },

  getYaxis: function() {
    var temp = new FABRIC.RT.Vec3();
    var xx = this.v.x * this.v.x; var xy = this.v.x * this.v.y; var xw = this.v.x * this.w;
    var yz = this.v.y * this.v.z;
    var zz = this.v.z * this.v.z; var zw = this.v.z * this.w;

    temp.x = 2 * (xy - zw);
    temp.y = 1 - 2 * (zz + xx);
    temp.z = 2 * (yz + xw);
    return temp;
  },

  getZaxis: function() {
    var temp = new FABRIC.RT.Vec3();
    var xx = this.v.x * this.v.x; var xz = this.v.x * this.v.z; var xw = this.v.x * this.w;
    var yy = this.v.y * this.v.y; var yz = this.v.y * this.v.z; var yw = this.v.y * this.w;

    temp.x = 2 * (yw + xz);
    temp.y = 2 * (yz - xw);
    temp.z = 1 - 2 * (yy + xx);
    return temp;
  },

  mirror: function(axisIndex) {
    var tempW = this.w;
    switch (axisIndex) {
      case 0: this.w = this.v.y; this.v.set(this.v.z, tempW, this.v.x); break;
      case 1: this.w = - this.v.x; this.v.set(-tempW, this.v.z, this.v.y); break;
      case 2: this.w = - this.w; this.v.set(this.v.x, this.v.y, - this.v.z); break;
    }
  },

  toMat33: function() {
    var temp = new FABRIC.RT.Mat33();

    var xx = this.v.x * this.v.x, xy = this.v.x * this.v.y, xz = this.v.x * this.v.z, xw = this.v.x * this.w;
    var yy = this.v.y * this.v.y, yz = this.v.y * this.v.z, yw = this.v.y * this.w;
    var zz = this.v.z * this.v.z, zw = this.v.z * this.w;

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

  // Note: this and q2 should be unit Quaternions
  sphericalLinearInterpolate: function(q2, t) {
    var angle = this.dot(q2);
    if (angle < 0.0) {
      q2 = q2.clone();
      q2.v = q2.v.negate();
      q2.w *= - 1.0;
    }

    var r;
    var cosHalfTheta = this.dot(q2);

    if (Math.abs(cosHalfTheta) < 1.0) {
      var halfTheta = Math.acos(cosHalfTheta);
      var sinHalfTheta = Math.sqrt(1.0 - cosHalfTheta * cosHalfTheta);

      if (Math.abs(sinHalfTheta) < Math.DIVIDEPRECISION) {
        r = new FABRIC.RT.Quat((this.w + q2.w) * 0.5, this.v.add(q2.v).multiplyScalar(0.5));
      }
      else {
        var rA = Math.sin((1 - t) * halfTheta) / sinHalfTheta;
        var rB = Math.sin(t * halfTheta) / sinHalfTheta;

        r = new FABRIC.RT.Quat(this.w * rA + q2.w * rB, this.v.multiplyScalar(rA).add(q2.v.multiplyScalar(rB)));
      }
    }
    else {
      // They're the same
      r = new FABRIC.RT.Quat(this);
    }
    return r.unit();
  },

  linearInterpolate: function(other, t) {
    var angle = this.dot(other);
    if (angle < 0.0) {
      other = other.clone()
      other.v = other.v.negate();
      other.w *= - 1.0;
    }

    var q = new FABRIC.RT.Quat(this.v.linearInterpolate(other.v, t), this.w + ((other.w - this.w) * t));
    return q.unit();
  },

  clone: function() {
    return new FABRIC.RT.Quat(this.w, this.v.clone());
  },

  toString: function() {
    return 'FABRIC.RT.Quat({' + this.v.x + ',' + this.v.y + ',' + this.v.z + '},' + this.w + ')';
  },

  getType: function() {
    return 'FABRIC.RT.Quat';
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
