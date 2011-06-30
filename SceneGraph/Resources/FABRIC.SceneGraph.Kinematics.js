
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//

FABRIC.SceneGraph.registerNodeType('Transform',
  function(options, scene) {
    scene.assignDefaults(options, {
        parentTransformNode: undefined,
        hierarchical: false,
        globalXfo: undefined,
        localXfo: undefined
      });
    options.dgnodenames.push('DGNode');

    var transformNode;
    var dgnode;
    var redrawEventHandler;
    var parentTransformNode;
    var children = [];

    transformNode = scene.constructNode('SceneGraphNode', options);
    dgnode = transformNode.getDGNode();
    dgnode.addMember('globalXfo', 'Xfo', options.globalXfo);
    if (options.hierarchical) {
      dgnode.addMember('localXfo', 'Xfo', options.localXfo);
    }

    scene.addMemberInterface(transformNode, dgnode, 'globalXfo');

    transformNode.getRedrawEventHandler = function() {
      if (redrawEventHandler) {
        return redrawEventHandler;
      }
      redrawEventHandler = scene.constructEventHandlerNode('TransformDraw');
      return redrawEventHandler;
    };

    scene.addMemberAndOperatorStackFunctions(transformNode, dgnode);

    if (options.hierarchical) {

      dgnode.bindings.append(scene.constructOperator( {
          operatorName: 'calcGlobalXfo',
          srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/calcGlobalXfo.kl',
          parameterBinding: [
            'self.localXfo',
            'parent.globalXfo',
            'self.globalXfo'
          ],
          entryFunctionName: 'calcGlobalXfo'
        }));

      scene.addMemberInterface(transformNode, dgnode, 'localXfo', true, true);

      // use a custom getter
      transformNode.pub.__defineSetter__('globalXfo', function(val) {
          if (!val.getType || val.getType() !== 'FABRIC.RT.Xfo') {
            throw ('Incorrect type assignment. Must assign a FABRIC.RT.Xfo');
          }
          if (parentTransformNode) {
            var parentXfo = parentTransformNode.globalXfo;
            parentXfo.invertInPlace();
            val.preMultiplyInPlace(parentXfo);
            dgnode.setData('localXfo', val);
          }
          else {
            dgnode.setData('globalXfo', val);
          }
        });

      transformNode.pub.getParentNode = function() {
          return scene.getPublicInterface(parentTransformNode);
        };
      transformNode.pub.setParentNode = function(node, reciprocate) {
          if (!node.isTypeOf('Transform')) {
            throw ('Incorrect type assignment. Must assign a Transform');
          }
          parentTransformNode = scene.getPrivateInterface(node);
          dgnode.addDependency(parentTransformNode.getDGNode(), 'parent');
          if (reciprocate !== false && node.addChild) {
            node.addChild(this, false);
          }
        };
      transformNode.pub.addChild = function(node, reciprocate) {
          children.push(node);
          if (reciprocate !== false) {
            node.setParentNode(this, false);
          }
        };
      transformNode.pub.getChildren = function() {
          return children;
        };

      if (options.parentTransformNode) {
        transformNode.pub.setParentNode(options.parentTransformNode);
      }
    }else {
      transformNode.pub.__defineSetter__('globalXfo', function(val) {
          if (!val.getType || val.getType() !== 'FABRIC.RT.Xfo') {
            throw ('Incorrect type assignment. Must assign a FABRIC.RT.Xfo');
          }
          dgnode.setData('globalXfo', 0, val);
        });
    }

    return transformNode;
  });


FABRIC.SceneGraph.registerNodeType('AimTransform',
  function(options, scene) {
    scene.assignDefaults(options, {
        target: FABRIC.RT.vec3(0, 0, 0),
        roll: 0.0
      });
    
    if(options.position && options.target){
      options.globalXfo = FABRIC.RT.xfo({ tr: options.position });
      
      var dirVec = options.position.subtract(options.target);
      var vec1 = options.globalXfo.ori.getZaxis();
      var vec2 = dirVec.unit();
      options.globalXfo.ori = FABRIC.RT.Quat.makeFrom2Vectors(FABRIC.RT.vec3(0, 0, 1) , vec2);
      vec1 = options.globalXfo.ori.getYaxis();
      vec2 = dirVec.cross(FABRIC.RT.vec3(0, 1, 0) ).cross(dirVec).unit();
      options.globalXfo.ori.postMultiplyInPlace( FABRIC.RT.Quat.makeFrom2Vectors(vec1, vec2));
      
/*
      var zaxis = options.position.subtract(options.target).unit();
      var yaxis = zaxis.cross(FABRIC.RT.vec3(0, 1, 0) ).cross(zaxis).unit();
      var xaxis = yaxis.cross(zaxis).unit();
      options.globalXfo = FABRIC.RT.xfo({ tr: options.position });
      options.globalXfo.ori.setFromMat33(FABRIC.RT.mat33(xaxis, yaxis, zaxis));
*/  }

    var aimTransformNode = scene.constructNode('Transform', options);
    var dgnode = aimTransformNode.getDGNode();
    dgnode.addMember('target', 'Vec3', options.target);

    dgnode.bindings.append(scene.constructOperator({
      operatorName: 'aimTransform',
      srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/aimTransform.kl',
      entryFunctionName: 'aimTransform',
      parameterBinding: [
        'self.globalXfo',
        'self.target'
      ]
    }));

    scene.addMemberInterface(aimTransformNode, dgnode, 'target', true);
    scene.addMemberInterface(aimTransformNode, dgnode, 'roll', true);
    
    return aimTransformNode;
  });
/*
FABRIC.SceneGraph.registerNodeType('AimCameraTransform',
  function(options, scene) {
    if(options.globalXfo && options.target){
      var dirVec = options.globalXfo.tr.subtract(options.target);
      var vec1 = options.globalXfo.ori.getZaxis();
      var vec2 = dirVec.unit();
      options.globalXfo.ori.postMultiplyInPlace(FABRIC.RT.Quat.makeFrom2Vectors(vec1, vec2));
      var zaxis = options.globalXfo.ori.getZaxis();
      vec1 = options.globalXfo.ori.getYaxis();
      vec2 = zaxis.cross(FABRIC.RT.vec3(0, 1, 0) ).cross(zaxis).unit();
      options.globalXfo.ori.postMultiplyInPlace( FABRIC.RT.Quat.makeFrom2Vectors(vec1, vec2));
    }
   var aimCameraTransformNode = scene.constructNode('AimTransform', options);
    return aimCameraTransformNode;
  });
  */

