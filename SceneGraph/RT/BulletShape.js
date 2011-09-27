
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//

FABRIC.RT.BulletShape = function() {
  this.pointer = null;
  this.type = -1;
  this.parameters = [];
  this.vertices = [];
};

// constants
FABRIC.RT.BulletShape.BULLET_BOX_SHAPE = 0;
FABRIC.RT.BulletShape.BULLET_CONVEX_HULL_SHAPE = 4;
FABRIC.RT.BulletShape.BULLET_SPHERE_SHAPE = 8;
FABRIC.RT.BulletShape.BULLET_CAPSULE_SHAPE = 10;
FABRIC.RT.BulletShape.BULLET_CONE_SHAPE = 11;
FABRIC.RT.BulletShape.BULLET_CYLINDER_SHAPE = 13;
FABRIC.RT.BulletShape.BULLET_GIMPACT_SHAPE = 25;
FABRIC.RT.BulletShape.BULLET_PLANE_SHAPE = 28;
FABRIC.RT.BulletShape.BULLET_COMPOUND_SHAPE = 31;
FABRIC.RT.BulletShape.BULLET_SOFTBODY_SHAPE = 32;


FABRIC.RT.BulletShape.prototype = {
};

FABRIC.RT.BulletShape.createBox = function(halfExtends) {
  if(halfExtends == undefined) {
    halfExtends = FABRIC.RT.vec3(1.0,1.0,1.0);
  }
  var shape = new FABRIC.RT.BulletShape();
  shape.type = FABRIC.RT.BulletShape.BULLET_BOX_SHAPE;
  shape.parameters.push(halfExtends.x);
  shape.parameters.push(halfExtends.y);
  shape.parameters.push(halfExtends.z);
  return shape;
};

FABRIC.RT.BulletShape.createSphere = function(radius) {
  if(radius == undefined) {
    radius = 1.0;
  }
  var shape = new FABRIC.RT.BulletShape();
  shape.type = FABRIC.RT.BulletShape.BULLET_SPHERE_SHAPE;
  shape.parameters.push(radius);
  return shape;
};

FABRIC.RT.BulletShape.createPlane = function(normal) {
  if(normal == undefined) {
    normal = FABRIC.RT.vec3(0.0,1.0,0.0);
  }
  var shape = new FABRIC.RT.BulletShape();
  shape.type = FABRIC.RT.BulletShape.BULLET_PLANE_SHAPE;
  shape.parameters.push(normal.x);
  shape.parameters.push(normal.y);
  shape.parameters.push(normal.z);
  shape.parameters.push(0.0);
  return shape;
};

FABRIC.RT.BulletShape.createConvexHull = function(geometryNode) {
  if(geometryNode == undefined) {
    throw('You need to specify the '+geometryNode+' for createConvexHull.');
  }
  var shape = new FABRIC.RT.BulletShape();
  shape.type = FABRIC.RT.BulletShape.BULLET_CONVEX_HULL_SHAPE;
  shape.geometryNode = geometryNode;
  return shape;
};

FABRIC.appendOnCreateContextCallback(function(context) {
  context.RegisteredTypesManager.registerType('BulletShape', {
    members: {
      pointer: 'Data',
      type: 'Integer',
      parameters: 'Scalar[]',
      vertices: 'Vec3[]',
    },
    constructor: FABRIC.RT.BulletShape,
    klBindings: {
      filename: 'BulletShape.kl',
      sourceCode: FABRIC.loadResourceURL('FABRIC_ROOT/SceneGraph/RT/BulletShape.kl')
    }
  });
});
