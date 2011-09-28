
//
// Copyright 2010-2011Fabric Technologies Inc. All rights reserved.
//

FABRIC.SceneGraph.registerNodeType('BulletWorldNode', {
  briefDesc: 'The BulletWorldNode represents a bullet physics simulation world.',
  detailedDesc: 'The BulletWorldNode represents a bullet physics simulation world.',
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
      createGroundPlane: true,
      connectToSceneTime: true,
      gravity: FABRIC.RT.vec3(0,-40,0),
      substeps: 3
    });
    
    // create the bullet node
    var bulletWorldNode = scene.constructNode('SceneGraphNode', {name: 'BulletWorldNode'});
    var dgnode = bulletWorldNode.constructDGNode('DGNode');
    dgnode.addMember('world', 'BulletWorld', new FABRIC.RT.BulletWorld(options));
    dgnode.addMember('prevTime', 'Scalar');

    // create the dgnodes to store shapes and bodies
    var shapedgnode = bulletWorldNode.constructDGNode('ShapeDGNode');
    var rbddgnode = bulletWorldNode.constructDGNode('RbdDGNode');
    var sbddgnode = bulletWorldNode.constructDGNode('SbdDGNode');
    rbddgnode.setDependency(dgnode,'simulation');
    rbddgnode.setDependency(shapedgnode,'shapes');
    sbddgnode.setDependency(dgnode,'simulation');
    
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
      shapedgnode.addMember(shapeName+'Shape', 'BulletShape', shape);

      // copy the points for convex hulls
      if(shape.type == FABRIC.RT.BulletShape.BULLET_CONVEX_HULL_SHAPE)
      {
        if(!shape.geometryNode)
          throw('You need to specify geometryNode for a convex hull shape!')
          
        // create rigid body operator
        shapedgnode.setDependency(scene.getPrivateInterface(shape.geometryNode).getAttributesDGNode(),shapeName+"Shape_attributes");
        shapedgnode.bindings.append(scene.constructOperator({
          operatorName: 'copy'+shapeName+'Vertices',
          parameterLayout: [
            'self.'+shapeName+'Shape',
            shapeName+"Shape_attributes.positions<>",
          ],
          entryFunctionName: 'copyShapeVertices',
          srcFile: 'FABRIC_ROOT/SceneGraph/KL/bullet.kl'
        }));
      }

      // create rigid body operator
      shapedgnode.bindings.append(scene.constructOperator({
        operatorName: 'create'+shapeName+'Shape',
        parameterLayout: [
          'self.'+shapeName+'Shape'
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
        
      // check if we are dealing with an array
      var isArray = body.constructor.toString().indexOf("Array") != -1;
      rbddgnode.addMember(bodyName+'Rbd', 'BulletRigidBody[]', isArray ? body : [body]);

      // create rigid body operator
      rbddgnode.bindings.append(scene.constructOperator({
        operatorName: 'create'+bodyName+'RigidBody',
        parameterLayout: [
          'simulation.world',
          'shapes.'+shapeName+'Shape',
          'self.'+bodyName+'Rbd'
        ],
        entryFunctionName: 'createBulletRigidBody',
        srcFile: 'FABRIC_ROOT/SceneGraph/KL/bullet.kl'
      }));
    }

    bulletWorldNode.pub.addSoftBody = function(bodyName,body) {
      if(bodyName == undefined)
        throw('You need to specify a bodyName when calling addSoftbody!');
      if(body == undefined)
        throw('You need to specify a body when calling addSoftbody!');
      if(body.trianglesNode == undefined)
        throw('You need to specify a trianglesNode for softbody when calling addSoftbody!');

      // check if we are dealing with an array
      sbddgnode.addMember(bodyName+'Sbd', 'BulletSoftBody', body);
      
      var trianglesNode = scene.getPrivateInterface(body.trianglesNode);
      sbddgnode.setDependency(trianglesNode.getAttributesDGNode(),bodyName+"_Attributes");
      sbddgnode.setDependency(trianglesNode.getUniformsDGNode(),bodyName+"_Uniforms");

      var dataCopy = scene.constructNode('GeometryDataCopy', {baseGeometryNode: trianglesNode.pub} );
      dataCopy.pub.addVertexAttributeValue('positions', 'Vec3', { genVBO:true, dynamic:true } );
      dataCopy.pub.addVertexAttributeValue('normals', 'Vec3', { genVBO:true, dynamic:true } );
      dataCopy.getAttributesDGNode().setDependency(sbddgnode,'softbody');

      // create the create softbody operator
      sbddgnode.bindings.append(scene.constructOperator({
        operatorName: 'create'+bodyName+'SoftBody',
        parameterLayout: [
          'simulation.world',
          'self.'+bodyName+'Sbd',
          bodyName+'_Attributes.positions<>',
          bodyName+'_Attributes.normals<>',
          bodyName+'_Uniforms.indices'
        ],
        entryFunctionName: 'createBulletSoftBody',
        srcFile: 'FABRIC_ROOT/SceneGraph/KL/bullet.kl'
      }));

      // create the softbody position operator
       dataCopy.getAttributesDGNode().bindings.append(scene.constructOperator({
        operatorName: 'getBulletSoftBodyPosition',
        parameterLayout: [
          'self.index',
          'softbody.'+bodyName+'Sbd',
          'self.positions',
          'self.normals'
        ],
        entryFunctionName: 'getBulletSoftBodyPosition',
        srcFile: 'FABRIC_ROOT/SceneGraph/KL/bullet.kl'
      }));
      
      return dataCopy.pub;
    }
    
    bulletWorldNode.pub.addConstraint = function(constraintName,constraint,bodyNameA,bodyNameB) {
      if(constraintName == undefined)
        throw('You need to specify a constraintName when calling addConstraint!');
      if(constraint == undefined)
        throw('You need to specify a constraint when calling addConstraint!');
      if(bodyNameA == undefined)
        throw('You need to specify a bodyNameA when calling addConstraint!');
      if(bodyNameB == undefined)
        throw('You need to specify a bodyNameB when calling addConstraint!');
        
      // check if we are dealing with an array
      var isArray = constraint.constructor.toString().indexOf("Array") != -1;
      rbddgnode.addMember(constraintName, 'BulletConstraint[]', isArray ? constraint : [constraint]);

      // create rigid body operator
      rbddgnode.bindings.append(scene.constructOperator({
        operatorName: 'create'+constraintName+'Constraint',
        parameterLayout: [
          'simulation.world',
          'self.'+constraintName,
          'self.'+bodyNameA+'Rbd',
          'self.'+bodyNameB+'Rbd'
        ],
        entryFunctionName: 'createBulletConstraint',
        srcFile: 'FABRIC_ROOT/SceneGraph/KL/bullet.kl'
      }));
    }

    bulletWorldNode.pub.addForce = function(forceName,force) {
      if(forceName == undefined)
        throw('You need to specify a forceName when calling addForce!');
      if(force == undefined)
        throw('You need to specify a force when calling addForce!');
        
      // check if we are dealing with an array
      var isArray = force.constructor.toString().indexOf("Array") != -1;
      dgnode.addMember(forceName+'Force', 'BulletForce[]', isArray ? force : [force]);
      bulletWorldNode.addMemberInterface(dgnode, forceName+'Force', true);

      // create rigid body operator
      dgnode.bindings.append(scene.constructOperator({
        operatorName: 'apply'+forceName+'Force',
        parameterLayout: [
          'self.world',
          'self.'+forceName+'Force',
        ],
        entryFunctionName: 'applyBulletForce',
        srcFile: 'FABRIC_ROOT/SceneGraph/KL/bullet.kl'
      }));
    }

    // create the ground plane
    if(options.createGroundPlane) {

      // create a shape
      // create the ground rigid body
      var groundTrans = FABRIC.RT.xfo({tr: FABRIC.RT.vec3(0,-1000,0)});
      bulletWorldNode.pub.addShape('Ground',FABRIC.RT.BulletShape.createBox(FABRIC.RT.vec3(1000,1000,1000)));
      bulletWorldNode.pub.addRigidBody('Ground',new FABRIC.RT.BulletRigidBody({mass: 0, transform: groundTrans}),'Ground');
      
      var instanceNode = scene.constructNode('Instance', {
        geometryNode: scene.constructNode('Grid', {
          size_x: 40.0,
          size_z: 40.0,
          sections_x: 20,
          sections_z: 20 }).pub,
        materialNode: scene.constructNode('FlatMaterial').pub
      });
      instanceNode.getDGNode().setDependency(rbddgnode,'rigidbodies');
    }
    
    // setup raycast relevant members
    var raycastingSetup = false;
    bulletWorldNode.setupRaycasting = function() {
      if(raycastingSetup)
        return;
      dgnode.addMember('raycastEnable','Boolean',false);
      bulletWorldNode.addMemberInterface(dgnode, 'raycastEnable', true);
      scene.addEventHandlingFunctions(bulletWorldNode);
      raycastingSetup = true;
    };

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
    var rigidBodyTransformNode = scene.constructNode('Transform', {name: options.name});

    // create the rigid body on the world
    var bodyName = rigidBodyTransformNode.pub.getName();
    options.bulletWorldNode.addRigidBody(bodyName,options.rigidBody,options.shapeName);
    var bulletWorldNode = scene.getPrivateInterface(options.bulletWorldNode);

    var dgnode = rigidBodyTransformNode.getDGNode();
    dgnode.setDependency(rbddgnode,'bodies');
    
    // check if we are using multiple rigid bodies
    if(options.rigidBody.constructor.toString().indexOf("Array") != -1)
      dgnode.setCount(options.rigidBody.length);
    
    // create the query transform op
    dgnode.bindings.append(scene.constructOperator({
      operatorName: 'getBulletRigidBodyTransform',
      parameterLayout: [
        'self.index',
        'bodies.'+bodyName+'Rbd',
        'self.globalXfo'
      ],
      entryFunctionName: 'getBulletRigidBodyTransform',
      srcFile: 'FABRIC_ROOT/SceneGraph/KL/bullet.kl'
    }));
    
    // setup raycasting to be driven by bullet
    var raycastEventHandler = undefined;
    rigidBodyTransformNode.getRaycastEventHandler = function() {
      if(raycastEventHandler == undefined) {
        var raycastOperator = scene.constructOperator({
          operatorName: 'raycastBulletWorld',
          srcFile: 'FABRIC_ROOT/SceneGraph/KL/bullet.kl',
          entryFunctionName: 'raycastBulletWorld',
          parameterLayout: [
            'raycastData.ray',
            'simulation.world',
            'simulation.raycastEnable'
          ]
        });

        raycastEventHandler = rigidBodyTransformNode.constructEventHandlerNode('Raycast');
        bulletWorldNode.setupRaycasting();
        raycastEventHandler.setScope('simulation', bulletWorldNode.getDGNode());
        // The selector will return the node bound with the given binding name.
        raycastEventHandler.setSelector('simulation', raycastOperator);
      }
      return raycastEventHandler;
    };
    
    return rigidBodyTransformNode;
  }});

FABRIC.SceneGraph.registerNodeType('BulletForceManipulator', {
  briefDesc: 'The BulletForceManipulator is a basic tool introducing new forces into a BulletWorld.',
  detailedDesc: 'The BulletForceManipulator is a basic tool introducing new forces into a BulletWorld.',
  parentNodeDesc: 'SceneGraphNode',
  optionsDesc: {
    enabled: 'The manipulator can be disabled, thereby allowing other manipulators to operate.',
    factor: 'The amount of force to introduce.',
    radius: 'The radius of the force to introduce.',
    useFalloff: 'If set to true, the force is multiplied by the distance to the manipulator.',
    useTorque: 'If set to true, the force will be a torque force, otherwise it is a central force.'
  },
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
        enabled: true,
        factor: 100,
        radius: 1.5,
        useFalloff: true,
        useTorque: true
      });

    if (!options.bulletWorldNode) {
      throw ('bulletWorldNode not specified');
    }
    if (!options.cameraNode) {
      throw ('cameraNode not specified');
    }
    var bulletWorldNode = scene.getPrivateInterface(options.bulletWorldNode);
    var cameraNode = options.cameraNode;
    bulletWorldNode.setupRaycasting();

    // introduce a new force....!
    var force = new FABRIC.RT.BulletForce({
      enable: false,
      autoDisable: true,
      factor: options.factor,
      useFalloff: options.useFalloff,
      useTorque: options.useTorque,
      radius: options.radius
    });
    bulletWorldNode.pub.addForce('Mouse', force);

    var forceManipulatorNode = scene.constructNode('SceneGraphNode', options);
    var enabled = options.enabled;
    forceManipulatorNode.pub.enable = function(){
      enabled = true;
    }
    forceManipulatorNode.pub.disable = function(){
      enabled = false;
    }
    forceManipulatorNode.pub.setFactor = function(value){
      force.factor = value;
      bulletWorldNode.pub.setMouseForce([force]);
    };
    forceManipulatorNode.pub.setRadius = function(value){
      force.radius = value;
      bulletWorldNode.pub.setMouseForce([force]);
    };
    
    var viewportNode, cameraXfo, upaxis, swaxis, hitPosition, hitDistance;
    var mouseDownScreenPos, viewportNode;
    var getCameraValues = function(evt) {
      viewportNode = evt.viewportNode;
      mouseDownScreenPos = FABRIC.RT.vec2(evt.screenX, evt.screenY);
      viewportNode = evt.viewportNode;
      cameraXfo = evt.cameraNode.getTransformNode().getGlobalXfo();
      swaxis = cameraXfo.ori.getXaxis();
      upaxis = cameraXfo.ori.getYaxis();
      hitPosition = evt.hitData.point;
      hitDistance = evt.hitData.distance;
    }
    
    var eventListenersAdded = false;
    var mouseDownFn = function(evt) {
      if(!enabled){
        return;
      }
      if(eventListenersAdded){
        return;
      }
      if (evt.button === 0) {
        getCameraValues(evt);
        document.addEventListener('mousemove', dragForceFn, false);
        document.addEventListener('mouseup', releaseForceFn, false);
        evt.stopPropagation();
        eventListenersAdded = true;
      }
    }
    bulletWorldNode.pub.addEventListener('mousedown_geom', mouseDownFn);

    var dragForceFn = function(evt) {
      if(!enabled || !eventListenersAdded){
        return;
      }

      var ray = viewportNode.calcRayFromMouseEvent(evt);
      var newHitPosition = ray.start.add(ray.direction.scale(hitDistance));
      force.origin = hitPosition;
      force.direction = newHitPosition.subtract(hitPosition);
      force.enabled = true;
      bulletWorldNode.pub.setMouseForce([force]);
      hitPosition = hitPosition.add(newHitPosition.subtract(hitPosition).scale(0.1));

      evt.stopPropagation();
      viewportNode.redraw();
    }
    var releaseForceFn = function(evt) {
      if(!eventListenersAdded){
        return;
      }
      eventListenersAdded = false;
      document.removeEventListener('mousemove', dragForceFn, false);
      document.removeEventListener('mouseup', releaseForceFn, false);
      evt.stopPropagation();
    }

    return forceManipulatorNode;
  }});

