
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//

/**
 * Function to determine if the given object is a xfo object.
 * @param {object} xfo The object to validate.
 * @return {boolean} True if the given object is a valid xfo.
 */
FABRIC.RT.isXfo = function(xfo) {
  return typeof xfo === 'object' &&
    'ori' in xfo && FABRIC.RT.isQuat(xfo.ori) &&
    'tr' in xfo && FABRIC.RT.isVec3(xfo.tr) &&
    'sc' in xfo && FABRIC.RT.isVec3(xfo.sc);
};

/**
 * Constructor for a xfo object.
 * @constructor
 */
FABRIC.RT.Xfo = function() {
  if (arguments.length == 1 && typeof arguments[0] === 'object') {
    var obj = arguments[0];
    if (obj.getType && obj.getType() == 'FABRIC.RT.Quat') {
      console.warn(' Please migrate code to pass an inilialization object. e.g. { ori:FABRIC.RT.Quat(x,x,x,x) }.');
      this.ori = obj;
      this.tr = new FABRIC.RT.Vec3(0, 0, 0);
      this.sc = new FABRIC.RT.Vec3(1, 1, 1);
    }
    else {
      if (!obj.ori && !obj.tr && !obj.sc) {
        throw'Error, you must pass in an inilialization object. e.g. { ori:FABRIC.RT.Quat(x,x,x,x) }.';
        }
      this.ori = obj.ori ? new FABRIC.RT.Quat(obj.ori) : new FABRIC.RT.Quat(0, 0, 0, 1);
      this.tr = obj.tr ? new FABRIC.RT.Vec3(obj.tr) : new FABRIC.RT.Vec3(0, 0, 0);
      this.sc = obj.sc ? new FABRIC.RT.Vec3(obj.sc) : new FABRIC.RT.Vec3(1, 1, 1);
    }
  }
  else {
    this.ori = (arguments.length > 0 ? arguments[0] : new FABRIC.RT.Quat(0, 0, 0, 1));
    this.tr = (arguments.length > 1 ? arguments[1] : new FABRIC.RT.Vec3(0, 0, 0));
    this.sc = (arguments.length > 2 ? arguments[2] : new FABRIC.RT.Vec3(1, 1, 1));
  }
};

FABRIC.RT.Xfo.prototype = {
  setFromMat44: function(m, ro) {
    if (!FABRIC.RT.isMat44(m))
      throw'Invalid matrix object for setFromMat44';

    if (!FABRIC.RT.isRotationOrder(ro))
      ro = new FABRIC.RT.RotationOrder();

    // We're going out on a limb and assuming this is a
    // straight homogenous transformation matrix. No
    // singularities, denormilizations, or projections.
    this.tr.x = m.row3.x;
    this.tr.y = m.row3.y;
    this.tr.z = m.row3.z;

    var row0 = new FABRIC.RT.Vec3(m.row0.x, m.row0.y, m.row0.z);
    var row1 = new FABRIC.RT.Vec3(m.row1.x, m.row1.y, m.row1.z);
    var row2 = new FABRIC.RT.Vec3(m.row2.x, m.row2.y, m.row2.z);

    // Grab the X scale and normalize the first row
    this.sc.x = row0.norm();
    row0.normalize();

    // Make the 2nd row orthogonal to the 1st
    row1.subInPlace(row0.multiply(row0.dot(row1)));

    // Grab the Y scale and normalize the 2nd row
    this.sc.y = row1.norm();
    row1.normalize();

    // Make the 3rd row orthogonal to the 1st and 2nd
    row2.subInPlace(row0.multiply(row0.dot(row2)));
    row2.subInPlace(row1.multiply(row1.dot(row2)));

    // Grab the Y scale and normalize the 2nd row
    this.sc.z = row2.norm();
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
    this.ori = e.toQuat();
  },
  makeMat44: function() {
    var scl = FABRIC.RT.mat44(),
    rot = FABRIC.RT.mat44(),
    trn = FABRIC.RT.mat44(),
    q = this.ori;

    scl.setDiagonal(FABRIC.RT.vec4(this.sc.x, this.sc.y, this.sc.z, 1.0));

    // [hi 20110311 this transpose shouldn't be needed but we do]
    rot.row0.x = 1.0 - 2.0 * (q.v.y * q.v.y + q.v.z * q.v.z);
    rot.row0.y = 2.0 * (q.v.x * q.v.y - q.v.z * q.w);
    rot.row0.z = 2.0 * (q.v.x * q.v.z + q.v.y * q.w);

    rot.row1.x = 2.0 * (q.v.x * q.v.y + q.v.z * q.w);
    rot.row1.y = 1.0 - 2.0 * (q.v.x * q.v.x + q.v.z * q.v.z);
    rot.row1.z = 2.0 * (q.v.y * q.v.z - q.v.x * q.w);

    rot.row2.x = 2.0 * (q.v.x * q.v.z - q.v.y * q.w);
    rot.row2.y = 2.0 * (q.v.y * q.v.z + q.v.x * q.w);
    rot.row2.z = 1.0 - 2.0 * (q.v.x * q.v.x + q.v.y * q.v.y);

    rot.row3.t = 1.0;
    rot = rot.transpose();

    trn.row3.x = this.tr.x;
    trn.row3.y = this.tr.y;
    trn.row3.z = this.tr.z;

    return scl.mul(trn.mul(rot));

    //  self = scl * rot * trn;
  },
  multiply: function(xf) {
    if (FABRIC.RT.isXfo(xf)) {
      var result = new FABRIC.RT.Xfo();
      result.sc = this.sc.multiply(xf.sc);
      result.ori = xf.ori.multiply(this.ori);
      //  result.ori = this.ori.multiply(xf.ori);
      result.tr = this.sc.multiply(xf.tr);
      result.tr = this.ori.rotateVector(result.tr);
      result.tr = this.tr.add(result.tr);
      return result;
    }else {
      throw'Incorrect param type for Multiply';
      }
  },
  multiplyInv: function(xf) {
    if (FABRIC.RT.isXfo(xf)) {
      var result = new FABRIC.RT.Xfo();
      result.tr = xf.tr.subtract(this.tr);
      result.tr = this.sc.invert().multiply(result.tr);
      result.tr = this.ori.invert().rotateVector(result.tr);
      result.sc = this.sc.invert().multiply(xf.sc);
      result.ori = xf.ori.multiply(this.ori.invert());
      //  result.ori = this.ori.invert().multiply(xf.ori);
      return result;
    }else {
      throw'Incorrect param type for Multiply';
      }
  },
  project: function(xf) {
    return this.multiply(xf);
  },
  projectInv: function(xf) {
    return this.multiplyInv(xf);
  },
  invert: function() {
    var result = new FABRIC.RT.Xfo();
    result.sc = this.sc.invert();
    result.ori = this.ori.invert();
    result.tr = this.tr.negate();
    return result;
  },
  transform: function(v) {
    if (FABRIC.RT.isVec3(v)) {
      return this.tr.add(this.ori.rotateVector(this.sc.multiply(v)));
    }else {
      throw'Incorrect param type for transform';
      }
  },
  clone: function() {
    var newXfo = new FABRIC.RT.Xfo;
    newXfo.ori = this.ori.clone();
    newXfo.tr = this.tr.clone();
    newXfo.sc = this.sc.clone();
    return newXfo;
  },
  toString: function() {
    return 'FABRIC.RT.xfo(' + this.ori.toString() + ',' + this.tr.toString() + ',' + this.sc.toString() + ')';
  },
  getType: function() {
    return 'FABRIC.RT.Xfo';
  },
  displayGUI: function($parentDiv, changeHandlerFn) {
    var val = this;
    var fn = function() {
      changeHandlerFn(val);
    };
    var oriRefreshFn = this.ori.displayGUI($parentDiv, fn); $parentDiv.append($('<br/>'));
    var trRefreshFn = this.tr.displayGUI($parentDiv, fn); $parentDiv.append($('<br/>'));
    var scRefreshFn = this.sc.displayGUI($parentDiv, fn);
    var refreshFn = function(val) {
      oriRefreshFn(val.ori);
      trRefreshFn(val.tr);
      scRefreshFn(val.sc);
    };
    return refreshFn;
  }
};

/**
 * Overloaded Constructor for a xfo object.
 * @return {object} The xfo object.
 */
FABRIC.RT.xfo = function() {
  // The following is a bit of a hack. Not sure if we can combine new and apply.
  if (arguments.length === 0) return new FABRIC.RT.Xfo();
  if (arguments.length === 1) return new FABRIC.RT.Xfo(arguments[0]);
  if (arguments.length === 2) return new FABRIC.RT.Xfo(arguments[0], arguments[1]);
  if (arguments.length === 3) return new FABRIC.RT.Xfo(arguments[0], arguments[1], arguments[2]);
};

FABRIC.appendOnCreateContextCallback(function(context) {
  context.RegisteredTypesManager.registerType('Xfo', {
    members: {
      ori: 'Quat', tr: 'Vec3', sc: 'Vec3'
    },
    constructor: FABRIC.RT.Xfo,
    klBindings: {
      filename: 'Xfo.kl',
      sourceCode: FABRIC.loadResourceURL('FABRIC_ROOT/SceneGraph/RT/Xfo.kl')
    }
  });
});
