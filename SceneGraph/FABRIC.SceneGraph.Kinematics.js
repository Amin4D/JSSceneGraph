
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//

FABRIC.SceneGraph.registerNodeType('Transform', {
  briefDesc: 'The Transform node implements a global or hierarchical transform.',
  detailedDesc: 'The Transform node uses a redraw eventhandler to draw an OpenGL projection. The node can be used in '+
                'a hierarchical mode, in which is projects its own projection into another Transform node\'s projection. '+
                'This allows to compute hierarchies in 3D.',
  parentNodeDesc: 'SceneGraphNode',
  optionsDesc: {
    hierarchical: 'Flag determining wether this Transform node should calculate a globalXfo based on a parents globalXfo',
    parentTransformNode: 'If the TransformNode is hierarchical, this option can optionally provide a parent transform node to immediately assign',
    globalXfo: 'Optional: Specify the intial globalXfo for this transform.',
    localXfo: 'Optional: Specify the intial localXfo for this transform.'
  },
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
        hierarchical: false,
        parentTransformNode: undefined,
        globalXfo: undefined,
        localXfo: undefined
      });

    var transformNode = scene.constructNode('SceneGraphNode', options),
      dgnode = transformNode.constructDGNode('DGNode'),
      textureNode = undefined,
      parentTransformNode,
      children = [];

    dgnode.addMember('globalXfo', 'Xfo', options.globalXfo);
    transformNode.addMemberInterface(dgnode, 'globalXfo');

    if (options.hierarchical) {
      dgnode.addMember('localXfo', 'Xfo', options.localXfo);
      dgnode.bindings.append(scene.constructOperator( {
          operatorName: 'calcGlobalXfo',
          srcFile: 'FABRIC_ROOT/SceneGraph/KL/calcGlobalXfo.kl',
          parameterLayout: [
            'self.localXfo',
            'parent.globalXfo',
            'self.globalXfo'
          ],
          entryFunctionName: 'calcGlobalXfo'
        }));

      transformNode.addMemberInterface(dgnode, 'localXfo', true, true);

      // use a custom getter
      transformNode.pub.setGlobalXfo = function(val) {
        if (!val.getType || val.getType() !== 'FABRIC.RT.Xfo') {
          throw ('Incorrect type assignment. Must assign a FABRIC.RT.Xfo');
        }
        if (parentTransformNode) {
          var parentXfo = parentTransformNode.getGlobalXfo();
          parentXfo.invertInPlace();
          val.preMultiplyInPlace(parentXfo);
          dgnode.setData('localXfo', val);
        }
        else {
          dgnode.setData('globalXfo', val);
        }
      };

      transformNode.pub.getParentNode = function() {
        return scene.getPublicInterface(parentTransformNode);
      };
      transformNode.pub.setParentNode = function(node, reciprocate) {
        if (!node.isTypeOf('Transform')) {
          throw ('Incorrect type assignment. Must assign a Transform');
        }
        parentTransformNode = scene.getPrivateInterface(node);
        dgnode.setDependency(parentTransformNode.getDGNode(), 'parent');
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
      transformNode.pub.setGlobalXfo = function(val) {
        if(val.constructor.toString().indexOf("Array") != -1)
        {
          dgnode.setCount(val.length);
          dgnode.setBulkData({ globalXfo: val});
        }
        else
        {
          if (!val.getType || val.getType() !== 'FABRIC.RT.Xfo') {
            throw ('Incorrect type assignment. Must assign a FABRIC.RT.Xfo');
          }
          dgnode.setData('globalXfo', 0, val);
        }
      };
    }
    
    transformNode.setupInstanceDrawing = function() {
      if(textureNode != undefined)
        return true;
      if(dgnode.getCount() <= 1)
        return false;
      
      // create the operator to convert the matrices into a texture
      dgnode.addMember('textureMatrix', 'Mat44');
      dgnode.bindings.append(scene.constructOperator( {
          operatorName: 'calcGlobalMatrix',
          srcFile: 'FABRIC_ROOT/SceneGraph/KL/calcGlobalXfo.kl',
          parameterLayout: [
            'self.globalXfo<>',
            'self.textureMatrix<>'
          ],
          entryFunctionName: 'calcGlobalMatrix'
        }));

      textureNode = scene.constructNode('TransformTexture', {transformNode: transformNode.pub});

      return true;  
    }
    
    transformNode.pub.getTransformTexture = function() {
      transformNode.setupInstanceDrawing();
      return textureNode.pub;
    }

    return transformNode;
  }});


FABRIC.SceneGraph.registerNodeType('AimTransform', {
  briefDesc: 'The AimTransform node implements a global lookat transform.',
  detailedDesc: 'The AimTransform uses the Transform node to implement a lookat transform, using a '+
                'root position as well as a target position. This node is used for the TargetCamera node.',
  parentNodeDesc: 'Transform',
  optionsDesc: {
    target: 'The target position for the initial direction of the Transform'
  },
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
        target: FABRIC.RT.vec3(0, 0, 0)
      });
    
    if(options.position && options.target){
      options.globalXfo = FABRIC.RT.xfo({ tr: options.position });
      
      var dirVec = options.position.subtract(options.target);
      var vec1 = options.globalXfo.ori.getZaxis();
      var vec2 = dirVec.unit();
      options.globalXfo.ori = FABRIC.RT.Quat.makeFrom2Vectors(FABRIC.RT.vec3(0, 0, 1) , vec2, true);
      vec1 = options.globalXfo.ori.getYaxis();
      vec2 = dirVec.cross(FABRIC.RT.vec3(0, 1, 0) ).cross(dirVec).unit();
      options.globalXfo.ori.postMultiplyInPlace( FABRIC.RT.Quat.makeFrom2Vectors(vec1, vec2, true));
      
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
      srcFile: 'FABRIC_ROOT/SceneGraph/KL/aimTransform.kl',
      entryFunctionName: 'aimTransform',
      parameterLayout: [
        'self.globalXfo',
        'self.target'
      ]
    }));

    aimTransformNode.addMemberInterface(dgnode, 'target', true);
    return aimTransformNode;
  }});



