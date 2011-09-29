
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//

//determine if an object is a valid RotationOrder.
FABRIC.RT.isRotationOrder = function(t) {
  return t && t.getType &&
         t.getType() === 'FABRIC.RT.RotationOrder';
};

//Constructor:
//  Supported args:
//    (none)
//    number (0..5)
//    order string (eg: 'xyz')
//    RotationOrder
FABRIC.RT.RotationOrder = function(arg) {
  if (typeof arg === 'number') {
    this.order = parseInt(arg);
    if (this.order < 0 || this.order > 5)
      throw'Invalid rotation order';
    }
  else if (typeof order == 'string') {
    var o = toLowerCase(arg);
    if (o == 'xyz') this.order = 0;
      else if (o == 'yzx') this.order = 1;
      else if (o == 'zxy') this.order = 2;
      else if (o == 'xzy') this.order = 3;
      else if (o == 'zyx') this.order = 4;
      else if (o == 'yxz') this.order = 5;
      else throw ('Invalid rotation order');
    }
  else if (FABRIC.RT.isRotationOrder(arg)) {
    this.order = arg.order;
  }
  else if (arg === undefined) {
    this.order = 0;
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

  setXYZ: function() {
    this.order = 0;
  },

  setYZX: function() {
    this.order = 1;
  },

  setZXY: function() {
    this.order = 2;
  },

  setXZY: function() {
    this.order = 3;
  },

  setZYX: function() {
    this.order = 4;
  },

  setYXZ: function() {
    this.order = 5;
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
    klBindings: {
      filename: 'RotationOrder.kl',
      sourceCode: FABRIC.loadResourceURL('FABRIC_ROOT/SceneGraph/RT/RotationOrder.kl')
    }
  });
});

//determine if an object is a valid Euler.
FABRIC.RT.isEuler = function(t) {
  return t && t.getType &&
         t.getType() === 'FABRIC.RT.Euler';
};

//Constructor:
//  Supported args:
//    (none)
//    x, y, z
//    x, y, z, ro
//    Vec3
//    Vec3, ro
//    ro
//    Euler
FABRIC.RT.Euler = function() {
  if ((arguments.length == 3 || arguments.length == 4) &&
      FABRIC.RT.isScalar(arguments[0]) && 
      FABRIC.RT.isScalar(arguments[1]) && 
      FABRIC.RT.isScalar(arguments[2]) ) {
    this.x = arguments[0];
    this.y = arguments[1];
    this.z = arguments[2];
    this.ro = new FABRIC.RT.RotationOrder(arguments[3]);
  }
  else if ((arguments.length == 1 || arguments.length == 2) && FABRIC.RT.isVec3(arguments[0])) {
    this.x = arguments[0].x;
    this.y = arguments[0].y;
    this.z = arguments[0].z;
    this.ro = new FABRIC.RT.RotationOrder(arguments[1]);
  }
  else if (arguments.length == 1 && FABRIC.RT.isEuler(arguments[0])) {
    this.x = arguments[0].x;
    this.y = arguments[0].y;
    this.z = arguments[0].z;
    this.ro = new FABRIC.RT.RotationOrder(arguments[0].ro);
  }
  else if (arguments.length == 0 || arguments.length == 1) {
    this.x = this.y = this.z = 0.0;
    this.ro = new FABRIC.RT.RotationOrder(arguments[0]);
  }
  else
    throw'new Euler: invalid arguments';
};

FABRIC.RT.Euler.prototype = {

  //set: see constructor for supported args
  set: function() {
    FABRIC.RT.Euler.apply(this, arguments);
    return this;
  },

  setAngles: function(v3) {
    this.x = v3.x;
    this.y = v3.y;
    this.z = v3.z;
  },

  getAngles: function(){
   return new FABRIC.RT.Vec3(this.x, this.y, this.z);
  },

  equal: function(e) {
    var result = //JS bug: if the condition is directly returned it is wrong (??)
      this.x === e.x &&
      this.y === e.y &&
      this.z === e.z &&
      this.ro.order === e.ro.order;
    return result;
  },

  almostEqual: function(e, precision) {
    if (precision === undefined) {
      precision = Math.PRECISION;
    }
    var result = //JS bug: if the condition is directly returned it is wrong (??)
      (Math.abs(this.x - e.x) < precision) &&
      (Math.abs(this.y - e.y) < precision) &&
      (Math.abs(this.z - e.z) < precision) &&
      (this.ro.order === e.ro.order);
    return result;
  },

  toMat33: function() {
    var Cx = Math.cos(this.x), Sx = Math.sin(this.x);
    var Cy = Math.cos(this.y), Sy = Math.sin(this.y);
    var Cz = Math.cos(this.z), Sz = Math.sin(this.z);

    var Rx = new FABRIC.RT.Mat33(
                1.0, 0.0, 0.0,
                0.0,  Cx, -Sx,
                0.0,  Sx,  Cx);

    var Ry = new FABRIC.RT.Mat33(
                 Cy,  0.0,  Sy,
                0.0,  1.0, 0.0,
                -Sy,  0.0,  Cy);

    var Rz = new FABRIC.RT.Mat33(
                 Cz,  -Sz,  0.0,
                 Sz,   Cz,  0.0,
                0.0,  0.0,  1.0);

    var result;

    if (this.ro.isXYZ())
      result = Rz.multiply(Ry.multiply(Rx));
    else if (this.ro.isYZX())
      result = Rx.multiply(Rz.multiply(Ry));
    else if (this.ro.isZXY())
      result = Ry.multiply(Rx.multiply(Rz));
    else if (this.ro.isXZY())
      result = Ry.multiply(Rz.multiply(Rx));
    else if (this.ro.isZYX())
      result = Rx.multiply(Ry.multiply(Rz));
    else if (this.ro.isYXZ())
      result = Rz.multiply(Rx.multiply(Ry));
    return result;
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
      x: 'Scalar', y: 'Scalar', z: 'Scalar', ro: 'RotationOrder'
    },
    constructor: FABRIC.RT.Euler,
    klBindings: {
      filename: 'Euler.kl',
      sourceCode: FABRIC.loadResourceURL('FABRIC_ROOT/SceneGraph/RT/Euler.kl')
    }
  });
});
