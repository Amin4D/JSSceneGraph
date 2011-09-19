
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//

/**
 * The basis simulation module.
 */
FABRIC.Simulation = FABRIC.Simulation ? FABRIC.Simulation : {};

/**
 * Constructor for a hashtable object
 * @constructor
 * @param {number} cellsize The size of a single cell.
 * @param {number} x The x position of the cell.
 * @param {number} y The y position of the cell.
 * @param {number} z The z position of the cell.
 */
FABRIC.Simulation.HashTable = function(cellsize, x, y, z) {
  this.cells = [];
  this.cellsize = cellsize ? cellsize : 1.0;
  this.x_count = x ? x : 10;
  this.y_count = y ? y : 1;
  this.z_count = z ? z : 10;
};

FABRIC.Simulation.HashTable.prototype = {
  getType: function() {
    return 'FABRIC.Simulation.HashTable';
  }
};

/**
 * Overloaded Constructor for a hashtable object
 * @param {number} cellsize The size of a single cell.
 * @param {number} x The x position of the cell.
 * @param {number} y The y position of the cell.
 * @param {number} z The z position of the cell.
 * @return {object} The hashtable object.
 */
FABRIC.Simulation.hashTable = function(cellsize, x, y, z) {
  return new FABRIC.Simulation.HashTable(cellsize, x, y, z);
};

FABRIC.appendOnCreateContextCallback(function(context) {
  context.RegisteredTypesManager.registerType('HashTable', {
    members: {
      cells: 'Integer[][]', cellsize: 'Scalar', x_count: 'Integer', y_count: 'Integer', z_count: 'Integer'
    },
    constructor: FABRIC.Simulation.HashTable,
    kBindings: FABRIC.loadResourceURL('FABRIC_ROOT/SceneGraph/RT/HashTable.kl')
  });
});
