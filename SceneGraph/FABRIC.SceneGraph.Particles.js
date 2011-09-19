
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//

// The Particles node is a relative of the 'Redraw' node.
// It is bound to a 'Geometry' which it renders for each Instance.

// Particles is similar to 'Points' except it is set up for multi-threading.
FABRIC.SceneGraph.registerNodeType('Particles', {
  briefDesc: 'The Particles node is a Points node with additional vertex attributes.',
  detailedDesc: 'The Particles node is a Points node with additional vertex attributes. It can be used to draw ' +
                'simulated Points with full transforms, so the Particles node contains more than only positions, '+
                'also orientations, velocities etc.',
  parentNodeDesc: 'Points',
  optionsDesc: {
    materialNode: 'The materialNode to use as a Material for this Particles node.',
    color: 'The default color for the particles in this Particles node.',
    size: 'The pointsize to use for the Particles node.',
    animated: 'Determines if the Particles node is animated or not.',
    simulated: 'Determines if the Particles node is simulated or not.',
    createSpatialHashTable: 'Set to true to build a spatial hash table, which can be used to increase performance.',
    cellsize: 'The cell size for the optional spatial hash table',
    displayGrid: 'Optionally create a grid node to create a reference for the Particles node.',
    x_count: 'The count of the segments along the X axis for the optional grid node.',
    y_count: 'The count of the segments along the Y axis for the optional grid node.',
    z_count: 'The count of the segments along the Z axis for the optional grid node.',
    previousframemembers: 'The vertex attributes that should be simulated and accessible for the previous frame.',
    createDebugLines: 'Set to true to draw lines for the current velocities.',
  },
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
    
    particlesNode.pub.setAttributeDynamic('positions');
    
    particlesNode.pub.addVertexAttributeValue('orientations', 'Vec3');
    particlesNode.pub.addVertexAttributeValue('velocities', 'Vec3');

    if (options.animated) {
      // This will force a re-evaluation of this node when time changes.
      particlesNode.getAttributesDGNode().addDependency(scene.getGlobalsNode(), 'globals');
    }

    if (options.createSpatialHashTable) {
      particlesNode.pub.addUniformValue('hashtable', 'HashTable',
        FABRIC.Simulation.hashTable(options.cellsize, options.x_count, options.y_count, options.z_count));
      var neighborInfluenceRange = options.cellsize / 2.0;
      particlesNode.pub.addVertexAttributeValue('neighborinfluencerange', 'Scalar', { defaultValue:neighborInfluenceRange });
      particlesNode.pub.addVertexAttributeValue('cellindices', 'Integer', { defaultValue:-1 });
      particlesNode.pub.addVertexAttributeValue('cellcoords', 'Vec3');

      particlesNode.pub.addVertexAttributeValue('previousframe_positions', 'Vec3');
      particlesNode.pub.addVertexAttributeValue('previousframe_velocities', 'Vec3');
      particlesNode.pub.addVertexAttributeValue('previousframe_orientations', 'Vec3');


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
            materialNode: scene.pub.constructNode('FlatMaterial', { color: FABRIC.RT.rgb(0.2, 0.2, 0.2) })
          });
      }

      // Calculate our cell index based on the back buffer data.
      particlesNode.getAttributesDGNode().bindings.append(scene.constructOperator({
        operatorName: 'calcCellIndex',
        srcFile: 'FABRIC_ROOT/SceneGraph/KL/particles.kl',
        entryFunctionName: 'calcCellIndex',
        parameterLayout: [
          'self.positions',
          'self.cellcoords',
          'self.cellindices',
          'uniforms.hashtable'
        ]
      }));

      // Swap buffers. This means that the up to date buffer is now the back buffer
      // and we will calculate the front buffer this update.
      particlesNode.getAttributesDGNode().bindings.append(scene.constructOperator({
        operatorName: 'copyCurrentFrameDataToPrevFrameData',
        srcFile: 'FABRIC_ROOT/SceneGraph/KL/particles.kl',
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
        srcFile: 'FABRIC_ROOT/SceneGraph/KL/particles.kl',
        entryFunctionName: 'populateHashTable',
        parameterLayout: [
          'uniforms.hashtable',
          'self.cellindices<>'
        ]
      }));
    }

    return particlesNode;

  }});

FABRIC.SceneGraph.registerNodeType('Flock', {
  briefDesc: 'The Flock node is a Particles node which simulates flocking behaviour.',
  detailedDesc: 'The Flock node is a Particles node which simulates flocking behaviour through KL operators. ' +
                'The node is furthermore able to visualize the current flocking targets for each particle.',
  parentNodeDesc: 'Particles',
  optionsDesc: {
    displayDebugging: 'Set to true to draw the current flocking target for each particle.',
  },
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
      displayDebugging: true
    });

    options.createSpatialHashTable = true;
    options.animated = true;
    options.simulated = true;

    var flockNode = scene.constructNode('Particles', options);
    flockNode.pub.addVertexAttributeValue('goals', 'Vec3');
    flockNode.pub.addVertexAttributeValue('neighborIndices', 'Integer[]');
    flockNode.pub.addVertexAttributeValue('neighborDistances', 'Scalar[]');
    
    flockNode.pub.addVertexAttributeValue('initialized', 'Boolean', false );
    flockNode.pub.addVertexAttributeValue('debugDraw', 'DebugGeometry' );
    flockNode.pub.addUniformValue('displayDebugging', 'Boolean', options.displayDebugging, true );
    
    flockNode.getAttributesDGNode().bindings.append(scene.constructOperator({
      operatorName: 'simulateParticles',
      srcFile: 'FABRIC_ROOT/SceneGraph/KL/flocking.kl',
      entryFunctionName: 'simulateFlock',
      parameterLayout: [
        'self.index',
        'self.initialized',

        'self.positions',
        'self.velocities',
        'self.goals',
        'self.cellindices',
        'self.cellcoords',

        'self.previousframe_positions<>',
        'self.previousframe_velocities<>',

        'self.neighborinfluencerange',
        'uniforms.hashtable',

        'globals.timestep',

        'self.neighborIndices',
        'self.neighborDistances',
        'self.debugDraw',
        'uniforms.displayDebugging'
      ]
    }));
    
    
    var debugGeometryDraw = scene.constructNode('DebugGeometryDraw', {
        dgnode: flockNode.getAttributesDGNode(),
        debugGemetryMemberName: 'debugDraw'
    });
    
    return flockNode;
  }});


