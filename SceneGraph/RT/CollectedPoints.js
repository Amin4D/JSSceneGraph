
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//

/**
 * Constructor for a collected points object.
 * @constructor
 */
FABRIC.RT.CollectedPoints = function() {
  this.points = [];
  this.distances = [];
};

FABRIC.appendOnCreateContextCallback(function(context) {
  context.RegisteredTypesManager.registerType('CollectedPoints', {
    members: {
      points: 'Integer[]', distances: 'Scalar[]'
    },
    constructor: FABRIC.RT.CollectedPoints
  });
});
