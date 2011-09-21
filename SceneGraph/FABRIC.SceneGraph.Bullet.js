
//
// Copyright 2010-2011Fabric Technologies Inc. All rights reserved.
//

/**
 * The bullet scene graph is the core implementation of Fabric's
 * bullet integration.
 */
FABRIC.SceneGraph.registerNodeType('BulletRigidBodyNode', {
  briefDesc: 'The BulletRigidBodyNode represents a collection of bullet physics rigid bodies.',
  detailedDesc: 'The BulletRigidBodyNode represents a collection of bullet physics rigid bodies.',
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
      shape: undefined,
      shapeName: 'shape'
    });

    var bulletShapeNode = scene.constructNode('SceneGraphNode', {name: 'BulletShapeNode'});
    var dgnode = bulletShapeNode.constructDGNode('DGNode');
    
    bulletShapeNode.pub.addShape = function(shapeName,shape) {
      if(shapeName == undefined)
        throw('You need to specify a shapeName when calling addShape!');
      if(shape == undefined)
        throw('You need to specify a shape when calling addShape!');
      dgnode.addMember(shapeName, 'BulletShape', shape);

      // create rigid body operator
      dgnode.bindings.append(scene.constructOperator({
        operatorName: 'createBulletShape',
        parameterLayout: [
          'self.'+shapeName
        ],
        entryFunctionName: 'createBulletShape',
        srcFile: 'FABRIC_ROOT/SceneGraph/KL/bullet.kl'
      }));
    }
    
    if(options.shape) {
      bulletShapeNode.pub.addShape(options.shape,options.shapeName);
    }
    
    return bulletShapeNode;
  }});

FABRIC.SceneGraph.registerNodeType('BulletWorldNode', {
  briefDesc: 'The BulletWorldNode represents a bullet physics simulation world.',
  detailedDesc: 'The BulletWorldNode represents a bullet physics simulation world.',
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
      createGroundPlane: true,
      connectToSceneTime: true
    });

    // create the bullet node
    var bulletWorldNode = scene.constructNode('SceneGraphNode', {name: 'BulletWorldNode'});
    var dgnode = bulletWorldNode.constructDGNode('DGNode');
    dgnode.addMember('world', 'BulletWorld');
    dgnode.addMember('prevTime', 'Scalar');

    // create the dgnodes to store shapes and bodies
    var shapedgnode = bulletWorldNode.constructDGNode('ShapeDGNode');
    var rbddgnode = bulletWorldNode.constructDGNode('RbdDGNode');
    rbddgnode.setDependency(dgnode,'simulation');
    rbddgnode.setDependency(shapedgnode,'shapes');
    
    // create world init operator
    dgnode.bindings.append(scene.constructOperator({
      operatorName: 'createBulletWorld',
      parameterLayout: [
        'self.world'
      ],
      entryFunctionName: 'createBulletWorld',
      srcFile: 'FABRIC_ROOT/SceneGraph/KL/bullet.kl'
    }));

    bulletWorldNode.pub.addShape = function(shapeName,shape) {
      if(shapeName == undefined)
        throw('You need to specify a shapeName when calling addShape!');
      if(shape == undefined)
        throw('You need to specify a shape when calling addShape!');
      shapedgnode.addMember(shapeName, 'BulletShape', shape);

      // create rigid body operator
      shapedgnode.bindings.append(scene.constructOperator({
        operatorName: 'createBulletShape',
        parameterLayout: [
          'self.'+shapeName
        ],
        entryFunctionName: 'createBulletShape',
        srcFile: 'FABRIC_ROOT/SceneGraph/KL/bullet.kl'
      }));
    }

    bulletWorldNode.pub.addRigidBody = function(bodyName,body,shapeName) {
      if(bodyName == undefined)
        throw('You need to specify a bodyName when calling addRigidBody!');
      if(body == undefined)
        throw('You need to specify a body when calling addRigidBody!');
      if(shapeName == undefined)
        throw('You need to specify a shapeName when calling addRigidBody!');
      rbddgnode.addMember(bodyName, 'BulletRigidBody', body);

      // create rigid body operator
      rbddgnode.bindings.append(scene.constructOperator({
        operatorName: 'createBulletRigidBody',
        parameterLayout: [
          'simulation.world',
          'shapes.'+shapeName,
          'self.'+bodyName
        ],
        entryFunctionName: 'createBulletRigidBody',
        srcFile: 'FABRIC_ROOT/SceneGraph/KL/bullet.kl'
      }));
    }

    // create the ground plane
    if(options.createGroundPlane) {

      // create a shape
      bulletWorldNode.pub.addShape('ground',FABRIC.RT.BulletShape.createPlane());
      // create the ground rigid body
      bulletWorldNode.pub.addRigidBody('ground',new FABRIC.RT.BulletRigidBody({mass: 0}),'ground');
    }

    // create animation operator
    if(options.connectToSceneTime) {
      dgnode.setDependency(scene.getGlobalsNode(), 'globals');
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
    } else {
      dgnode.addMember('time','Scalar',0.0);
      dgnode.bindings.append(scene.constructOperator({
        operatorName: 'stepBulletWorld',
        parameterLayout: [
          'self.world',
          'self.prevTime',
          'self.time'
        ],
        entryFunctionName: 'stepBulletWorld',
        srcFile: 'FABRIC_ROOT/SceneGraph/KL/bullet.kl'
      }));
    }
    
    return bulletWorldNode;
  }});

FABRIC.SceneGraph.registerNodeType('BulletRigidBodyTransform', {
  briefDesc: 'The BulletRigidBodyTransform represents a bullet physics rigid body based transform.',
  detailedDesc: 'The BulletRigidBodyTransform represents a bullet physics rigid body based transform.',
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
      rigidBody: undefined,
      shape: undefined,
      bulletWorldNode: undefined,
      shapeName: undefined,
      hierarchical: false
    });
    
    // check if we have a rigid body!
    if(!options.rigidBody) {
      throw('You need to specify a rigidBody for this constructor!');
    }
    
    // check if we have a world node
    if(!options.bulletWorldNode) {
      throw('You need to specify a bulletWorldNode for this constructor!');
    }
    if(!options.bulletWorldNode.isTypeOf('BulletWorldNode')) {
      throw('The specified bulletWorldNode is not of type \'BulletWorldNode\'.');
    }
    var rbddgnode = scene.getPrivateInterface(options.bulletWorldNode).getRbdDGNode();

    // check if we have a shape node
    if(!options.shapeName) {
      throw('You need to specify a shapeName for this constructor!');
    }
    
    // create the transform node
    var rigidBodyTransformNode = scene.constructNode('Transform');

    // create the rigid body on the world
    var bodyName = rigidBodyTransformNode.pub.getName();
    options.bulletWorldNode.addRigidBody(bodyName,options.rigidBody,options.shapeName);

    var dgnode = rigidBodyTransformNode.getDGNode();
    dgnode.setDependency(rbddgnode,'bodies');
    
    // create the query transform op
    dgnode.bindings.append(scene.constructOperator({
      operatorName: 'getBulletRigidBodyTransform',
      parameterLayout: [
        'bodies.'+bodyName,
        'self.globalXfo'
      ],
      entryFunctionName: 'getBulletRigidBodyTransform',
      srcFile: 'FABRIC_ROOT/SceneGraph/KL/bullet.kl'
    }));
    
    return rigidBodyTransformNode;
  }});
