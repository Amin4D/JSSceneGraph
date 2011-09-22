
//
// Copyright 2010-2011Fabric Technologies Inc. All rights reserved.
//

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
      shapedgnode.addMember(shapeName, 'BulletShape', shape);

      // copy the points for convex hulls
      if(shape.type == FABRIC.RT.BulletShape.BULLET_CONVEX_HULL_SHAPE)
      {
        if(!shape.geometryNode)
          throw('You need to specify geometryNode for a convex hull shape!')
          
        // create rigid body operator
        shapedgnode.setDependency(scene.getPrivateInterface(shape.geometryNode).getAttributesDGNode(),shapeName+"_attributes");
        shapedgnode.bindings.append(scene.constructOperator({
          operatorName: 'copy'+shapeName+'Vertices',
          parameterLayout: [
            'self.'+shapeName,
            shapeName+"_attributes.positions<>",
          ],
          entryFunctionName: 'copyShapeVertices',
          srcFile: 'FABRIC_ROOT/SceneGraph/KL/bullet.kl'
        }));
      }

      // create rigid body operator
      shapedgnode.bindings.append(scene.constructOperator({
        operatorName: 'create'+shapeName+'Shape',
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
        
      // check if we are dealing with an array
      var isArray = body.constructor.toString().indexOf("Array") != -1;
      rbddgnode.addMember(bodyName, 'BulletRigidBody[]', isArray ? body : [body]);

      // create rigid body operator
      rbddgnode.bindings.append(scene.constructOperator({
        operatorName: 'create'+bodyName+'RigidBody',
        parameterLayout: [
          'simulation.world',
          'shapes.'+shapeName,
          'self.'+bodyName
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
      sbddgnode.addMember(bodyName, 'BulletSoftBody', body);
      
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
          'self.'+bodyName,
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
          'softbody.'+bodyName,
          'self.positions',
          'self.normals'
        ],
        entryFunctionName: 'getBulletSoftBodyPosition',
        srcFile: 'FABRIC_ROOT/SceneGraph/KL/bullet.kl'
      }));
      
      return dataCopy.pub;
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
    
    // check if we are using multiple rigid bodies
    if(options.rigidBody.constructor.toString().indexOf("Array") != -1)
      dgnode.setCount(options.rigidBody.length)
    
    // create the query transform op
    dgnode.bindings.append(scene.constructOperator({
      operatorName: 'getBulletRigidBodyTransform',
      parameterLayout: [
        'self.index',
        'bodies.'+bodyName,
        'self.globalXfo'
      ],
      entryFunctionName: 'getBulletRigidBodyTransform',
      srcFile: 'FABRIC_ROOT/SceneGraph/KL/bullet.kl'
    }));
    
    return rigidBodyTransformNode;
  }});
