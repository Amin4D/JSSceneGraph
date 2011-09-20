
//
// Copyright 2010-2011Fabric Technologies Inc. All rights reserved.
//

/**
 * The bullet scene graph is the core implementation of Fabric's
 * bullet integration.
 */
FABRIC.SceneGraph.registerNodeType('BulletWorldNode', {
  briefDesc: 'The BulletWorldNode represents a bullet physics simulation world.',
  detailedDesc: 'The BulletWorldNode represents a bullet physics simulation world.',
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
      createGroundPlane: true
    });

    // create the bullet node
    var bulletWorldNode = scene.constructNode('SceneGraphNode');
    var dgnode = bulletWorldNode.constructDGNode('DGNode');
    dgnode.addMember('world', 'BulletWorld');
    dgnode.addMember('prevTime', 'Scalar');
    
    // create world init operator
    dgnode.bindings.append(scene.constructOperator({
      operatorName: 'createBulletWorld',
      parameterLayout: [
        'self.world'
      ],
      entryFunctionName: 'createBulletWorld',
      srcFile: 'FABRIC_ROOT/SceneGraph/KL/bullet.kl'
    }));

    // create the ground plane
    if(options.createGroundPlane) {
      dgnode.addMember('ground', 'BulletRigidBody', new FABRIC.RT.BulletRigidBody({
        shape: FABRIC.RT.BulletShape.createPlane(),
        mass: 0
      }));

      // create rigid body operator
      dgnode.bindings.append(scene.constructOperator({
        operatorName: 'createBulletRigidBody',
        parameterLayout: [
          'self.world',
          'self.ground'
        ],
        entryFunctionName: 'createBulletRigidBody',
        srcFile: 'FABRIC_ROOT/SceneGraph/KL/bullet.kl'
      }));
    }

    // create animation operator
    dgnode.addDependency(scene.getGlobalsNode(), 'globals');
    dgnode.bindings.append(scene.constructOperator({
      operatorName: 'stepBulletWorld',
      parameterLayout: [
        'self.world',
        'self.prevTime',
        'globals.time'
      ],
      entryFunctionName: 'stepBulletWorld',
      srcFile: 'FABRIC_ROOT/SceneGraph/KL/bullet.kl'
    }));
    
    return bulletWorldNode;
  }});

FABRIC.SceneGraph.registerNodeType('BulletRigidBodyTransform', {
  briefDesc: 'The BulletRigidBodyTransform represents a bullet physics rigid body based transform.',
  detailedDesc: 'The BulletRigidBodyTransform represents a bullet physics rigid body based transform.',
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
      rigidBody: undefined,
      bulletWorldNode: undefined,
      hierarchical: false
    });
    
    // check if we have a rigid body!
    if(!options.rigidBody) {
      throw('You need to specify a rigidBody for this constructor!');
    }
    if(!options.bulletWorldNode) {
      throw('You need to specify a bulletWorldNode for this constructor!');
    }
    if(!options.bulletWorldNode.isTypeOf('BulletWorldNode')) {
      throw('The specified bulletWorldNode is not of type \'BulletWorldNode\'.');
    }
    var worlddgnode = scene.getPrivateInterface(options.bulletWorldNode).getDGNode();

    // create the bullet node
    var rigidBodyTransformNode = scene.constructNode('Transform');
    var dgnode = rigidBodyTransformNode.getDGNode();
    dgnode.addMember('body', 'BulletRigidBody', options.rigidBody);
    dgnode.addDependency(worlddgnode,'simulation');
    
    // create rigid body operator
    dgnode.bindings.append(scene.constructOperator({
      operatorName: 'createBulletRigidBody',
      parameterLayout: [
        'simulation.world',
        'self.body'
      ],
      entryFunctionName: 'createBulletRigidBody',
      srcFile: 'FABRIC_ROOT/SceneGraph/KL/bullet.kl'
    }));

    // create the query transform op
    dgnode.bindings.append(scene.constructOperator({
      operatorName: 'getBulletRigidBodyTransform',
      parameterLayout: [
        'self.body',
        'self.globalXfo'
      ],
      entryFunctionName: 'getBulletRigidBodyTransform',
      srcFile: 'FABRIC_ROOT/SceneGraph/KL/bullet.kl'
    }));
    
    return rigidBodyTransformNode;
  }});
