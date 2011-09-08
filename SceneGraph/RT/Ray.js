
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//

/**
 * Constructor function to create a Ray object.
 * @constructor
 * @param {object} start A Vec3 defining the start of the ray.
 * @param {object} direction A Vec3 defining the direction of the ray.
 */
FABRIC.RT.Ray = function(start, direction) {
  this.start = FABRIC.RT.isVec3(start) ? start : FABRIC.RT.vec3();
  this.direction = FABRIC.RT.isVec3(direction) ? direction : FABRIC.RT.vec3(1, 0, 0);
};

FABRIC.RT.Ray.prototype = {
  intersectPlane: function(planePoint, planeNormal) {
    var w, D, N;
    w = this.start.subtract(planePoint);
    D = planeNormal.dot(this.direction);
    N = - planeNormal.dot(w);

    if (Math.abs(D) < PRECISION) {
      // segment is parallel to plane
      if (N === 0) {
        // segment lies in plane
        return - 1;
      }
      else {
        return - 1; // no intersection
      }
    }
    // they are not parallel
    // compute intersect param
    var sI = N / D;
    if (sI < 0) {
      return - 1; // no intersection
    }
    return {
      point: this.start.add(this.direction.scale(sI)), dist: sI
    };
  },

  distanceToPoint: function(point) {
    var v, w, c1, c2, rayT, dist;

    w = point.subtract(this.start);
    c1 = w.dot(this.direction);
    c2 = this.direction.dot(this.direction);
    rayT = c1 / c2;

    if (rayT >= 0.0) {
      var pointOnRay = this.start.add(this.direction.scale(rayT));
      return pointOnRay.dist(point);
    }
    else {
      return this.start.dist(point);
    }
  },

  // distanceFromLineToLine():
  //    Input:  two 3D lines L1 and L2
  //    Return: the shortest distance between L1 and L2
  distanceToLine: function(lineP0, lineP1) {
    var u, v, w, dP;
    var a, b, c, d, e, D;
    var result = {
      lineParam: 0.0, rayParam: 0.0
    };
    u = lineP1.subtract(lineP0);
    w = lineP0.subtract(this.start);
    a = u.dot(u); // always >= 0
    b = u.dot(this.direction);
    c = this.direction.dot(this.direction); // always >= 0
    d = u.dot(w);
    e = this.direction.dot(w);
    D = a * c - b * b; // always >= 0

    // com_pute the line _parameters of the two closest points
    if (D < 0.001) {
      // the lines are almost parallel
      lineParam = 0.0;
      if (b > c) {
        // use the largest denominator
        result.rayParam = d / b;
      }
      else {
        result.rayParam = e / c;
      }
    }
    else {
      result.lineParam = (b * e - c * d) / D;
      result.rayParam = (a * e - b * d) / D;
    }

    // get the difference of the two closest points
    result.deltaVec = w.add(u.scale(result.lineParam).subtract(this.direction.scale(result.rayParam)));
    result.dist = result.deltaVec.length();
    return result; // return the closest distance
  }
};

/**
 * Conversion function to create a ray from a given viewport.
 * @param {number} width The width of the viewport in pixels.
 * @param {number} height The height of the viewport in pixels.
 * @param {number} x The x position of the ray origin in pixels.
 * @param {number} y The y position of the ray origin in pixels.
 * @param {object} cameraMat44 The camera matrix(44).
 * @param {object} projectionMat44 The projection matrix(44).
 * @return {object} The converted ray object.
 */
FABRIC.RT.Ray.calculateRayFromViewportData = function(
  width,
  height,
  x,
  y,
  cameraMat44,
  projectionMat44
) {
  var ray = new FABRIC.RT.Ray();
  // Convert the raster coordinates to screen space ([0,{w|h}] -> [-1,1]
  // - Note: The raster vertical is inverted wrt OGL screenspace Y
  var sx = x / width;
  var sy = y / height;

  sx = (sx * 2.0) - 1.0;
  sy = (sy * 2.0) - 1.0;

  // Transform the origin from camera local to world space
  var camInv = cameraMat44.inverse();

  //  ray.start = camInv.mul(FABRIC.RT.vec3(0.0, 0.0, 0.0));
  ray.start = FABRIC.RT.vec3(camInv.row3.x, camInv.row3.y, camInv.row3.z);

  // Get the projected window coordinate on the near plane
  // See http://www.songho.ca/opengl/gl_projectionmatrix.html
  // for details.
  var projInv = projectionMat44.inverse();

  ray.direction = projInv.mul(FABRIC.RT.vec3(sx, - sy, - 1.0));

  // And from projection space to camera local.
  // - We nuke the translation part since we're transforming a vector.
  camInv.row3.x = 0.0;
  camInv.row3.y = 0.0;
  camInv.row3.z = 0.0;
  ray.direction = camInv.mul(ray.direction).unit();
  return ray;
};

FABRIC.appendOnCreateContextCallback(function(context) {
  context.RegisteredTypesManager.registerType('Ray', {
    members: {
      start: 'Vec3', direction: 'Vec3'
    },
    constructor: FABRIC.RT.Ray,
    kBindings: FABRIC.loadResourceURL('FABRIC_ROOT/SceneGraph/RT/Ray.kl')
  });
});

/**
 * Constructor of a RayIntersection object.
 * @constructor
 */
FABRIC.RT.RayIntersection = function() {
  this.point = FABRIC.RT.vec3();
  this.normal = FABRIC.RT.vec3();
  this.distance = 0;
  this.elementid = - 1;
};

FABRIC.appendOnCreateContextCallback(function(context) {
  context.RegisteredTypesManager.registerType('RayIntersection', {
    members: {
      point: 'Vec3', normal: 'Vec3', distance: 'Scalar', elementid: 'Integer'
    },
    constructor: FABRIC.RT.RayIntersection
  });
});
