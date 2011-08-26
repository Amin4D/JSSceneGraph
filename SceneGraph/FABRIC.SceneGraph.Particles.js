
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//

// The Particles node is a relative of the 'Redraw' node.
// It is bound to a 'Geometry' which it renders for each Instance.

// Particles is similar to 'Points' except it is set up for multi-threading.
FABRIC.SceneGraph.registerNodeType('Particles', {
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
      materialNode: undefined,
      color: FABRIC.RT.rgb(0.75, 0.75, 0.75),
      size: 3.0,
      animated: false,
      simulated: false,
      createSpatialHashTable: false,
      cellsize: 5.0,
      x_count: 30,
      y_count: 1,
      z_count: 30,
      displayGrid: true,
      previousframemembers: [
        'positions',
        'velocities',
        'orientations'
      ],
      createDebugLines: true
    });

    var redrawEventHandler;
    options.createSlicedNode = true;
    if (options.dynamicMembers) {
      options.dynamicMembers.push('positions');
    }
    else {
      options.dynamicMembers = ['positions'];
    }

    var particlesNode = scene.constructNode('Points', options);
    particlesNode.pub.addVertexAttributeValue('orientations', 'Vec3');
    particlesNode.pub.addVertexAttributeValue('velocities', 'Vec3');

    if (options.animated) {
      // This will force a re-evaluation of this node when time changes.
      particlesNode.getAttributesDGNode().addDependency(scene.getGlobalsNode(), 'globals');
    }

    if (options.createSpatialHashTable) {
      var spatialHashDGNode = particlesNode.constructDGNode('SpatialHashDGNode');
      var neighborInfluenceRange = options.cellsize / 2.0;
      particlesNode.pub.addVertexAttributeValue('neighborinfluencerange', 'Scalar', { defaultValue:neighborInfluenceRange });
      particlesNode.pub.addVertexAttributeValue('cellindices', 'Integer', { defaultValue:-1 });
      particlesNode.pub.addVertexAttributeValue('cellcoords', 'Vec3');

      particlesNode.pub.addVertexAttributeValue('previousframe_positions', 'Vec3');
      particlesNode.pub.addVertexAttributeValue('previousframe_velocities', 'Vec3');
      particlesNode.pub.addVertexAttributeValue('previousframe_orientations', 'Vec3');

      spatialHashDGNode.addMember('hashtable', 'HashTable',
        FABRIC.Simulation.hashTable(options.cellsize, options.x_count, options.y_count, options.z_count));

      particlesNode.getAttributesDGNode().addDependency(spatialHashDGNode, 'hashtable');

      // Display the Grid
      if (options.displayGrid)
      {
        scene.pub.constructNode('Instance', {
            geometryNode: scene.pub.constructNode('Grid', {
              size_x: options.cellsize * options.x_count,
              size_z: options.cellsize * options.x_count,
              sections_x: options.x_count + 1,
              sections_z: options.z_count + 1
            }),
            materialNode: scene.pub.constructNode('FlatMaterial', { color: FABRIC.RT.rgb(0.3, 0.3, 0.3) })
          });
      }

      // Calculate our cell index based on the back buffer data.
      particlesNode.getAttributesDGNode().bindings.append(scene.constructOperator({
        operatorName: 'calcCellIndex',
        srcFile: 'FABRIC_ROOT/SceneGraph/KL/spatialHashTable.kl',
        entryFunctionName: 'calcCellIndex',
        parameterLayout: [
          'self.index',
          'self.positions',
          'self.cellcoords',
          'self.cellindices',
          'hashtable.hashtable'
        ]
      }));

      // Swap buffers. This means that the up to date buffer is now the back buffer
      // and we will calculate the front buffer this update.
      particlesNode.getAttributesDGNode().bindings.append(scene.constructOperator({
        operatorName: 'copyCurrentFrameDataToPrevFrameData',
        srcFile: 'FABRIC_ROOT/SceneGraph/KL/spatialHashTable.kl',
        entryFunctionName: 'copyCurrentFrameDataToPrevFrameData',
        parameterLayout: [
          'self.positions',
          'self.velocities',
          'self.previousframe_positions',
          'self.previousframe_velocities'
        ]
      }));


      // This operator counts all the points which exist in each
      // cell and writes thier ids to the hash table. This operator
      // is single threaded and should be the last to execute.
      particlesNode.getAttributesDGNode().bindings.append(scene.constructOperator({
        operatorName: 'populateHashTable',
        srcFile: 'FABRIC_ROOT/SceneGraph/KL/spatialHashTable.kl',
        entryFunctionName: 'populateHashTable',
        parameterLayout: [
          'hashtable.hashtable',
          'self.cellindices[]'
        ]
      }));
    }

    return particlesNode;

  }});

FABRIC.SceneGraph.registerNodeType('Flock', {
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
    });

    options.createSpatialHashTable = true;
    options.animated = true;
    options.simulated = true;

    var flockNode = scene.constructNode('Particles', options);
    flockNode.pub.addVertexAttributeValue('goals', 'Vec3');
    flockNode.pub.addVertexAttributeValue('neighborIndices', 'Integer[]');
    flockNode.pub.addVertexAttributeValue('neighborDistances', 'Scalar[]');
    flockNode.getAttributesDGNode().bindings.append(scene.constructOperator({
      operatorName: 'simulateParticles',
      srcFile: 'FABRIC_ROOT/SceneGraph/KL/flocking.kl',
      entryFunctionName: 'simulateParticles',
      parameterLayout: [
        'self.index',

        'self.positions',
        'self.velocities',
        'self.goals',
        'self.cellindices',
        'self.cellcoords',

        'self.previousframe_positions[]',
        'self.previousframe_velocities[]',

        'self.neighborinfluencerange',
        'hashtable.hashtable',

        'globals.timestep',

        'self.neighborIndices',
        'self.neighborDistances'
      ]
    }));
    return flockNode;
  }});


