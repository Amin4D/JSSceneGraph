
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//

if (!FABRIC.RT.Quat) {
  throw ('FABRIC.RT.Quat.js must be loaded first');
  }

/**
 * Function to determine if the given object is a valid rotation order object.
 * @param {object} ro The object to validate.
 * @return {boolean} True if the given object is a valid rotation order.
 */
FABRIC.RT.isRotationOrder = function(ro) {
  return typeof ro === 'object' && typeof ro.order === 'number' && ro.order >= 0 && ro.order <= 5;
};

/**
 * Constructor for a rotation order object.
 * @constructor
 * @param {string / number} order The rotation order to use.
 */
FABRIC.RT.RotationOrder = function(order) {
  if (typeof order === 'number') {
    this.order = parseInt(order);
    if (this.order < 0 || this.order > 5)
      throw'Invalid rotation order';
    }
  else if (typeof order == 'string') {
    var o = toLowerCase(order);
    if (o == 'xyz') this.order = 0;
      else if (o == 'yzx') this.order = 1;
      else if (o == 'zxy') this.order = 2;
      else if (o == 'xzy') this.order = 3;
      else if (o == 'zyx') this.order = 4;
      else if (o == 'yxz') this.order = 5;
      else throw ('Invalid rotation order');
    }
  else if (order === undefined) {
    this.order = 0; // XYZ
  }
  else
    throw'RotationOrder: invalid arguments';
  };

FABRIC.RT.RotationOrder.prototype = {
  isXYZ: function() {
    return this.order == 0;
  },
  isYZX: function() {
    return this.order == 1;
  },
  isZXY: function() {
    return this.order == 2;
  },
  isXZY: function() {
    return this.order == 3;
  },
  isZYX: function() {
    return this.order == 4;
  },
  isYXZ: function() {
    return this.order == 5;
  },

  isReversed: function() {
    return this.isXZY() || this.isZYX() || this.isYXZ();
  },
  clone: function() {
    return (new FABRIC.RT.RotationOrder(this.order));
  },
  toString: function() {
    var o = '<undefined>';
    if (this.order == 0) o = 'xyz';
      else if (this.order == 1) o = 'yzx';
      else if (this.order == 2) o = 'zxy';
      else if (this.order == 3) o = 'xzy';
      else if (this.order == 4) o = 'zyx';
      else if (this.order == 5) o = 'yxz';
      return this.getType() + '(' + o + ')';
  },
  getType: function() {
    return 'FABRIC.RT.RotationOrder';
  }
};

FABRIC.appendOnCreateContextCallback(function(context) {
  context.RegisteredTypesManager.registerType('RotationOrder', {
    members: {
      order: 'Integer'
    },
    constructor: FABRIC.RT.RotationOrder,
    kBindings: FABRIC.loadResourceURL('FABRIC_ROOT/SceneGraph/RT/RotationOrder.kl')
  });
});

/**
 * Function to determine if the given object is a valid euler rotation object.
 * @param {object} euler The object to validate.
 * @return {boolean} True if the given object is a valid euler rotation.
 */
FABRIC.RT.isEuler = function(euler) {
  return typeof euler === 'object' &&
    'x' in euler &&
    typeof euler.x === 'number' &&
    'y' in euler &&
    typeof euler.y === 'number' &&
    'z' in euler &&
    typeof euler.z === 'number' &&
    'order' in euler &&
    FABRIC.RT.isRotationOrder(order);
};

/**
 * Constructor for a euler rotation object.
 * @constructor
 * @param {number} x The x angle rotation.
 * @param {number} y The y angle rotation.
 * @param {number} z The z angle rotation.
 * @param {object} ro The rotation order for this rotation.
 */
FABRIC.RT.Euler = function(x, y, z, ro) {
  if (typeof x === 'number' && typeof y === 'number' && typeof z == 'number') {
    this.x = x;
    this.y = y;
    this.z = z;
    if (FABRIC.RT.isRotationOrder(ro))
      this.ro = ro.clone();
    else
      this.ro = new FABRIC.RT.RotationOrder(ro);
  }
  else if (FABRIC.RT.isVec3(x) && z === undefined && ro === undefined) {
    this.x = x.x;
    this.y = x.y;
    this.z = x.z;
    if (FABRIC.RT.isRotationOrder(y))
      this.ro = y.clone();
    else
      this.ro = new FABRIC.RT.RotationOrder(y);
  }
  else if (x === undefined && y === undefined && z === undefined) {
    this.x = this.y = this.z = 0.0;
    if (FABRIC.RT.isRotationOrder(ro))
      this.ro = ro.clone();
    else
      this.ro = new FABRIC.RT.RotationOrder(ro);
  }
  else
    throw'new Euler: invalid arguments';

    // [hi Remove when binding order has been fixed]
  this.dummy = new FABRIC.RT.Quat();
};

/**
 * Overloaded Constructor for a euler rotation object.
 * @param {number} x The x angle rotation.
 * @param {number} y The y angle rotation.
 * @param {number} z The z angle rotation.
 * @param {object} order The rotation order for this rotation.
 * @return {object} the euler rotation object.
 */
FABRIC.RT.euler = function(x, y, z, order) {
  return new FABRIC.RT.Euler(x, y, z, order);
};

FABRIC.RT.Euler.prototype = {
  setAngles: function(x, y, z) {
    return this.x = parseFloat(x); this.y = parseFloat(y); this.z = parseFloat(z);
  },

  toQuat: function() {
    var ti, tj, tk;
    ti = (this.x * 0.5) * Math.PI / 180.0;
    tj = (this.ro.isReversed() ? - this.y * 0.5 : this.y * 0.5) * Math.PI / 180.0;
    tk = (this.z * 0.5) * Math.PI / 180.0;
    var ci = Math.cos(ti), cj = Math.cos(tj), ck = Math.cos(tk);
    var si = Math.sin(ti), sj = Math.sin(tj), sk = Math.sin(tk);
    var cc = ci * ck, cs = ci * sk, sc = si * ck, ss = si * sk;
    var ai, aj, ak;
    ai = cj * sc - sj * cs;
    aj = cj * ss + sj * cc;
    ak = cj * cs - sj * sc;
    if (this.ro.isReversed())
      aj = - aj;
    var r = new FABRIC.RT.Quat();
    r.w = cj * cc + sj * ss;

    if (this.ro.isXYZ()) {
      r.v.x = ai; r.v.y = aj; r.v.z = ak;
    }
    else if (this.ro.isYZX()) {
      r.v.x = aj; r.v.y = ak; r.v.z = ai;
    }
    else if (this.ro.isZXY()) {
      r.v.x = ak; r.v.y = ai; r.v.z = aj;
    }
    else if (this.ro.isXZY()) {
      r.v.x = ai; r.v.y = ak; r.v.z = aj;
    }
    else if (this.ro.isZYX()) {
      r.v.x = ak; r.v.y = aj; r.v.z = ai;
    }
    else if (this.ro.isYXZ()) {
      r.v.x = aj; r.v.y = ai; r.v.z = ak;
    }

    return r;
  },
  setRotationOrder: function(ro) {
    this.ro = new FABRIC.RT.RotationOrder(ro);
  },
  // Returns true if the vector is equal to the argument
  eql: function(e) {
    return FABRIC.RT.isEuler(e) &&
      (Math.abs(this.x - e.x) < FABRIC.RT.precision) &&
      (Math.abs(this.y - e.y) < FABRIC.RT.precision) &&
      (Math.abs(this.z - e.z) < FABRIC.RT.precision) &&
      (this.ro.order == e.ro.order);
  },

  // Returns a copy of the vector
  clone: function() {
    return (new FABRIC.RT.Euler(this.x, this.y, this.z, this.ro));
  },

  toString: function() {
    return this.getType() + '(' + this.x + ',' + this.y + ',' + this.z + ',' + this.ro.toString() + ')';
  },
  getType: function() {
    return 'FABRIC.RT.Euler';
  },
  displayGUI: function($parentDiv, changeHandlerFn) {
    var val = this;
    var fn = function() {
      changeHandlerFn(val);
    }
    var size = 47;
    var $xWidget = $('<input type="number" style="width:' + size + '%" value="' + this.x + '"/>').bind(
      'change', function(event, ui) {
        val.x = parseFloat($(this).val()); fn();
    });
    var $yWidget = $('<input type="number" style="width:' + size + '%" value="' + this.y + '"/>').bind(
      'change', function(event, ui) {
        val.y = parseFloat($(this).val()); fn();
    });
    var $zWidget = $('<input type="number" style="width:' + size + '%" value="' + this.z + '"/>').bind(
      'change', function(event, ui) {
        val.z = parseFloat($(this).val()); fn();
    });

    $parentDiv.append($xWidget);
    $parentDiv.append($yWidget);
    $parentDiv.append($zWidget);
    return function() {
      $xWidget.val(val.x);
      $yWidget.val(val.y);
      $zWidget.val(val.z);
    }
  }
};

FABRIC.appendOnCreateContextCallback(function(context) {
  context.RegisteredTypesManager.registerType('Euler', {
    members: {
      x: 'Scalar', y: 'Scalar', z: 'Scalar', ro: 'RotationOrder', dummy: 'Quat'
    },
    constructor: FABRIC.RT.Euler,
    kBindings: FABRIC.loadResourceURL('FABRIC_ROOT/SceneGraph/RT/Euler.kl')
  });
});
