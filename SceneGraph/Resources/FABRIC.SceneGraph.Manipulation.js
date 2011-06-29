
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//

FABRIC.SceneGraph.registerNodeType('CameraManipulator',
  function(options, scene) {
    scene.assignDefaults(options, {
        mouseWheelZoomRate: 0.3,
        mouseDragZoomRate:0.001,
        orbitRate: 0.25,
        enabled: true
      });

    if (!options.targetNode) {
      throw ('Camera not specified');
    }

    var cameraNode = options.targetNode;
    var cameraManipulatorNode = scene.constructNode('SceneGraphNode', options);
    var enabled = options.enabled;
    cameraManipulatorNode.pub.enable = function(){
      enabled = true;
    }
    cameraManipulatorNode.pub.disable = function(){
      enabled = false;
    }

    var mouseWheelZoomFn = function(evt) {
      if(!enabled){
        return;
      }
      var zoomDist = cameraNode.focalDistance * options.mouseWheelZoomRate * evt.wheelDelta * -0.001;
      var cameraXfo = cameraNode.getTransformNode().globalXfo;
      var cameraZoom = cameraXfo.ori.getZaxis().mulInPlace(zoomDist);
      cameraXfo.tr.addInPlace(cameraZoom);
      cameraNode.getTransformNode().globalXfo = cameraXfo;
      if (!cameraNode.getTransformNode().target) {
        cameraNode.focalDistance = cameraNode.focalDistance - zoomDist;
      }
      evt.viewportNode.redraw();
      evt.stopPropagation();
    }
    cameraNode.addEventListener('mousewheel', mouseWheelZoomFn, false);

    var cameraPos, cameraTarget, cameraOffset, cameraXfo, upaxis, swaxis, focalDist;
    var mouseDownScreenPos, viewportNode;
    var getCameraValues = function(evt) {
      mouseDownScreenPos = FABRIC.RT.vec2(evt.screenX, evt.screenY);
      viewportNode = evt.viewportNode;
      cameraXfo = evt.cameraNode.getTransformNode().globalXfo;
      cameraPos = cameraXfo.tr;
      swaxis = cameraXfo.ori.getXaxis();
      upaxis = cameraXfo.ori.getYaxis();

      focalDist = evt.cameraNode.focalDistance;
      cameraOffset = cameraXfo.ori.getZaxis().scale(-focalDist);
      cameraTarget = cameraPos.add(cameraOffset);
    }
    var mouseDownFn = function(evt) {
      if(!enabled){
        return;
      }
      if (evt.button === 0) {
        getCameraValues(evt);
        document.addEventListener('mousemove', dragOrbitFn, true);
        document.addEventListener('mouseup', releaseOrbitFn, true);
        evt.stopPropagation();
      }
      else if (evt.button === 1) {
        getCameraValues(evt);
        document.addEventListener('mousemove', dragPanFn, true);
        document.addEventListener('mouseup', releasePanFn, true);
        evt.stopPropagation();
      }
      else if (evt.button === 2) {
        getCameraValues(evt);
        document.addEventListener('mousemove', dragZoomFn, true);
        document.addEventListener('mouseup', releaseZoomFn, true);
        evt.stopPropagation();
      }
    }
    cameraNode.addEventListener('mousedown', mouseDownFn);

    var dragOrbitFn = function(evt) {
      if(!enabled){
        return;
      }
      var mouseDragScreenPos = FABRIC.RT.vec2(evt.screenX, evt.screenY);
      var mouseDragScreenDelta = mouseDragScreenPos.subtract(mouseDownScreenPos);

      var orbitAngle = mouseDragScreenDelta.length() * options.orbitRate;
      mouseDragScreenDelta.normalize();
      var dragDir = upaxis.multiply(mouseDragScreenDelta.y).add(swaxis.multiply(-mouseDragScreenDelta.x));
      var orbitAxis = dragDir.cross(cameraOffset);
      orbitAxis.normalize();

      var newcameraXfo = cameraXfo.clone();
      var orbit = FABRIC.RT.Quat.makeFromAxisAndAngle(orbitAxis, orbitAngle);
      var newCameraOffset = orbit.rotateVector(cameraOffset);
      newcameraXfo.ori.postMultiplyInPlace(orbit);
      newcameraXfo.tr = cameraTarget.subtract(newCameraOffset);
      cameraNode.getTransformNode().globalXfo = newcameraXfo;
      viewportNode.redraw();
      evt.stopPropagation();
    }

    var releaseOrbitFn = function(evt) {
      document.removeEventListener('mousemove', dragOrbitFn, true);
      document.removeEventListener('mouseup', releaseOrbitFn, true);
    }
    var dragPanFn = function(evt) {
      if(!enabled){
        return;
      }
      var mouseDragScreenPos = FABRIC.RT.vec2(evt.screenX, evt.screenY);
      var mouseDragScreenDelta = mouseDragScreenPos.subtract(mouseDownScreenPos);
      var dragDist = upaxis.multiply(mouseDragScreenDelta.y)
                           .add(swaxis.multiply(-mouseDragScreenDelta.x))
                           .mulInPlace(focalDist * 0.001);
      var newcameraXfo = cameraXfo.clone();
      newcameraXfo.tr.addInPlace(dragDist);
      cameraNode.getTransformNode().globalXfo = newcameraXfo;
      if (cameraNode.getTransformNode().target) {
        cameraNode.getTransformNode().target = cameraTarget.add(dragDist);
      }
      viewportNode.redraw();
      evt.stopPropagation();
    }
    var releasePanFn = function(evt) {
      document.removeEventListener('mousemove', dragPanFn, true);
      document.removeEventListener('mouseup', releasePanFn, true);
      evt.stopPropagation();
    }


    var dragZoomFn = function(evt) {
      if(!enabled){
        return;
      }
      var mouseDragScreenDelta = evt.screenX - mouseDownScreenPos.x;
      cameraNode.position = cameraPos.add(cameraPos.subtract(cameraTarget)
                                     .mulInPlace(mouseDragScreenDelta * options.mouseDragZoomRate));
      viewportNode.redraw();
      evt.stopPropagation();
    }
    var releaseZoomFn = function(evt) {
      document.removeEventListener('mousemove', dragZoomFn, true);
      document.removeEventListener('mouseup', releaseZoomFn, true);
      evt.stopPropagation();
    }

    return cameraManipulatorNode;
  });


FABRIC.SceneGraph.registerNodeType('PaintManipulator',
  function(options, scene) {
    scene.assignDefaults(options, {
      brushSize: 0.1,
      brushScaleSpeed: 1.0,
      enabled:true
      });

    options.dgnodenames.push('RayCastDGNode');

    var paintManipulatorNode = scene.constructNode('SceneGraphNode', options),
      collectPointsDgNode = paintManipulatorNode.getRayCastDGNode(),
      paintEventHandler,
      paintEvent,
      viewportNode,
      brushPos,
      width,
      height,
      cameraMatrix,
      projectionMatrix,
      aspectRatio,
      paintableNodes = [],
      paintableNodePaintHandlers = [],
      enabled = options.enabled;

    scene.addEventHandlingFunctions(paintManipulatorNode);
    
    collectPointsDgNode.addMember('cameraMatrix', 'Mat44');
    collectPointsDgNode.addMember('projectionMatrix', 'Mat44');
    collectPointsDgNode.addMember('aspectRatio', 'Scalar');
    collectPointsDgNode.addMember('brushPos', 'Vec3');
    collectPointsDgNode.addMember('brushSize', 'Scalar', options.brushSize);

    scene.addMemberInterface(paintManipulatorNode, collectPointsDgNode, 'brushSize', true);

    // Note: this is not the intended design model for our brushing tools.
    // Adding the color here is just a hack to make the demo work well.
    collectPointsDgNode.addMember('brushColor', 'Color', options.brushColor);
    scene.addMemberInterface(paintManipulatorNode, collectPointsDgNode, 'brushColor', true);

    paintEventHandler = scene.constructEventHandlerNode('Viewport_raycast');
    paintEventHandler.addScope('paintData', collectPointsDgNode);

    // Raycast events are fired from the viewport. As the event
    // propagates down the tree it collects scopes and fires operators.
    // The operators us the collected scopes to calculate the ray.
    paintEvent = scene.constructEventNode(options.name + 'Event');
    paintEvent.appendEventHandler(paintEventHandler);

    var brushMaterial = scene.constructNode('FlatScreenSpaceMaterial', { color: FABRIC.RT.rgb(0.8, 0, 0) });
    var brushShapeTransform = scene.constructNode('Transform', { hierarchical: false, globalXfo: FABRIC.RT.xfo({
        ori: FABRIC.RT.Quat.makeFromAxisAndAngle(FABRIC.RT.vec3(1, 0, 0), 90),
        sc: FABRIC.RT.vec3(0, 0, 0)
      }) });
    var brushInstance = scene.constructNode('Instance', {
        transformNode: brushShapeTransform.pub,
        geometryNode: scene.constructNode('Circle', { radius: 1.0 }).pub,
        materialNode: brushMaterial.pub,
        enableDrawing: false
      });

    var collectPoints = function() {
      collectPointsDgNode.setData('brushPos', brushPos);
      collectPointsDgNode.setData('cameraMatrix', cameraMatrix);
      collectPointsDgNode.setData('projectionMatrix', projectionMatrix);
      collectPointsDgNode.setData('aspectRatio', aspectRatio);
      return paintEvent.select('CollectedPoints');
    };

    var resizePaintBrushFn = function(evt) {
      if(!enabled){
        return;
      }
      options.brushSize += evt.wheelDelta * 0.0001 * options.brushScaleSpeed;
      options.brushSize = Math.max(options.brushSize, 0.01);
      collectPointsDgNode.setData('brushSize', options.brushSize);
      evt.stopPropagation();
      evt.viewportNode.redraw();
    }
    scene.pub.addEventListener('mousewheel', resizePaintBrushFn, false);

    var moveBrush = function(evt) {
      width = parseInt(evt.target.width, 10);
      height = parseInt(evt.target.height, 10);
      aspectRatio = width / height;
      brushPos = FABRIC.RT.vec3(((evt.offsetX / width) - 0.5) * 2.0, ((evt.offsetY / height) - 0.5) * -2.0, 0);

      brushShapeTransform.pub.globalXfo = FABRIC.RT.xfo({
          tr: brushPos,
          ori: FABRIC.RT.Quat.makeFromAxisAndAngle(FABRIC.RT.vec3(1, 0, 0), 90),
          sc: FABRIC.RT.vec3(options.brushSize / aspectRatio, options.brushSize, options.brushSize)
        });
    }

    var mouseMoveFn = function(evt) {
      if(!enabled){
        return;
      }
      viewportNode = evt.viewportNode;
      moveBrush(evt);
      viewportNode.redraw();
    }
    scene.pub.addEventListener('mousemove', mouseMoveFn);

    var paintFn = function(evt) {
      if(!enabled){
        return;
      }
      moveBrush(evt);
      var points = collectPoints();

  //    evt.paintData = points[0].value;
      paintManipulatorNode.pub.fireEvent('onpaint', evt);
      viewportNode.redraw();
      evt.stopPropagation();
    }

    var mouseDownFn = function(evt) {
      if(!enabled){
        return;
      }
      if (evt.button === 0) {
        // Paint
        cameraMatrix = viewportNode.getCameraNode().cameraMat44;
        projectionMatrix = viewportNode.getCameraNode().projectionMat44;

        document.addEventListener('mousemove', paintFn, true);
        document.addEventListener('mouseup', releasePaintFn, true);

        paintManipulatorNode.pub.fireEvent('onbeginpaint', evt);
        paintFn(evt);
      }
    }
    scene.pub.addEventListener('mousedown', mouseDownFn);

    var releasePaintFn = function(evt) {
      document.removeEventListener('mousemove', paintFn, true);
      document.removeEventListener('mouseup', releasePaintFn, true);
    }

    paintManipulatorNode.pub.addPaintableNode = function(node) {
      if (!node.isTypeOf || !node.isTypeOf('Instance')) {
        throw ('Incorrect type. Must assign a Instance');
      }

      var paintInstanceEventHandler,
        instanceNode = scene.getPrivateInterface(node),
        geometryNode = scene.getPrivateInterface(instanceNode.pub.getGeometryNode()),
        transformNode = scene.getPrivateInterface(instanceNode.pub.getTransformNode()),
        paintOperator;

      paintInstanceEventHandler = scene.constructEventHandlerNode(options.name + '_paint_' + node.name);
      paintInstanceEventHandler.addScope('geometry_vertexattributes', geometryNode.getAttributesDGNode());
      paintInstanceEventHandler.addScope('transform', transformNode.getDGNode());
      paintInstanceEventHandler.addScope('instance', instanceNode.getDGNode());

      // The selector will return the node bound with the given binding name.
      paintInstanceEventHandler.setSelector('instance', scene.constructOperator({
          operatorName: 'collectPointsInsideBrush',
          srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/collectPointsInsideVolume.kl',
          entryFunctionName: 'collectPointsInsideBrush',
          parameterBinding: [

            'paintData.cameraMatrix',
            'paintData.projectionMatrix',
            'paintData.aspectRatio',

            'paintData.brushPos',
            'paintData.brushSize',
            'paintData.brushColor',

            'transform.' + instanceNode.pub.getTransformNodeMember(),
            'geometry_vertexattributes.positions[]',
            'geometry_vertexattributes.normals[]',
            'geometry_vertexattributes.vertexColors[]'
          ]
        }));

      // the sceneRaycastEventHandler propogates the event throughtout the scene.
      paintEventHandler.appendChildEventHandler(paintInstanceEventHandler);

      paintableNodes.push(instanceNode);
      paintableNodePaintHandlers.push(paintInstanceEventHandler);
    };

    paintManipulatorNode.pub.enable = function(){
      enabled = true;
      brushInstance.pub.drawToggle = true;
      scene.pub.redrawAllWindows();
    }
    paintManipulatorNode.pub.disable = function(){
      enabled = false;
      brushInstance.pub.drawToggle = false;
      scene.pub.redrawAllWindows();
    }

    return paintManipulatorNode;
  });


FABRIC.SceneGraph.registerNodeType('Manipulator',
  function(options, scene) {
    scene.assignDefaults(options, {
        targetNode: undefined,
        targetMember: undefined,
        targetMemberIndex: undefined,
        parentNode: undefined,
        parentMember: undefined,
        parentMemberIndex: undefined,
        color: FABRIC.RT.rgb(0, 0.8, 0, 1),
        highlightcolor: FABRIC.RT.rgb(0.8, 0.8, 0.8, 1),
        localXfo: new FABRIC.RT.Xfo(),
        disableZBuffer: false
      });

    var compensation = true,
       color = options.color,
       highlightColor = options.highlightcolor,
       material = scene.pub.constructNode('FlatMaterial', { color: options.color });

    var parentNode = options.parentNode;
    if (parentNode && parentNode.isTypeOf('Instance')) {
      parentNode = parentNode.getTransformNode();
    }

    var parentMember = options.parentMember;
    var parentMemberIndex = options.parentMemberIndex;
    if (parentMember == undefined) {
      parentMember = 'globalXfo';
      parentMemberIndex = undefined;
    }

    // get the target node (the one we are manipulating)
    var targetNode = options.targetNode;
    var targetMember = options.targetMember;
    var targetMemberIndex = options.targetMemberIndex;
    if (!targetNode) {
      targetNode = parentNode;
      targetMember = parentMember;
      targetMemberIndex = parentMemberIndex;
      compensation = false;
    }
    else {
      if (!targetMember) {
        throw ('If you specify a targetNode you must also specify the targetMember.');
      }
    }

    if (!parentNode) {
      parentNode = targetNode;
    }

    if (!targetNode || !targetMember) {
      // Note: this might be redundant. TODO: check and possibly remove
      throw ('Cannot set a transform if the targetNode is not set.');
    }

    targetNode = scene.getPrivateInterface(targetNode);
    parentNode = scene.getPrivateInterface(parentNode);
    ///////////////////////////////////////////////////////////
    // Construct the Transform node and configure it.
    // construct a scene graph node for the transform
    // for this manipulator. then, connect it via operator to
    // be driven by the target and the parent space
    // we are going to use a non hierarchical transfor
    // for that.
    var transformNode = scene.constructNode('Transform', { hierarchical: false });
    var transformDGNode = transformNode.getDGNode();
    transformDGNode.addMember('localXfo', 'Xfo', options.localXfo);
    transformNode.__defineGetter__('localXfo', function() {
        return transformDGNode.getData('localXfo');
      });
    transformNode.__defineSetter__('localXfo', function(val) {
        if (!val.getType || val.getType() !== 'FABRIC.RT.Xfo') {
          throw ('Incorrect type assignment. Must assign a FABRIC.RT.Xfo');
        }
        transformDGNode.setData('localXfo', 0, val);
      });

    transformDGNode.addDependency(parentNode.getDGNode(), 'parent');
    transformDGNode.addDependency(targetNode.getDGNode(), 'target');
    transformDGNode.addMember('parentMemberIndex', 'Integer',
      parentMemberIndex == undefined ? -1 : parseInt(parentMemberIndex));
    transformDGNode.addMember('targetMemberIndex', 'Integer',
      targetMemberIndex == undefined ? -1 : parseInt(targetMemberIndex));
    transformDGNode.addMember('compensation', 'Boolean', compensation);

    var paramLayout = [
      'self.globalXfo',
      'self.parentMemberIndex',
      'self.targetMemberIndex',
      'self.compensation',
      'self.localXfo'
    ];

    if (parentMemberIndex == undefined) {
      transformDGNode.addMember('parentMemberDummy', 'Xfo[]');
      paramLayout.push('parent.' + parentMember);
      paramLayout.push('self.parentMemberDummy');
    }
    else {
      transformDGNode.addMember('parentMemberDummy', 'Xfo');
      paramLayout.push('self.parentMemberDummy');
      paramLayout.push('parent.' + parentMember);
    }
    if (targetMemberIndex == undefined) {
      transformDGNode.addMember('targetMemberDummy', 'Xfo[]');
      paramLayout.push('target.' + targetMember);
      paramLayout.push('self.targetMemberDummy');
    }
    else {
      transformDGNode.addMember('targetMemberDummy', 'Xfo');
      paramLayout.push('self.targetMemberDummy');
      paramLayout.push('target.' + targetMember);
    }

    transformDGNode.bindings.append(scene.constructOperator({
      operatorName: 'evaluateGizmo',
      srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/evaluateGizmo.kl',
      entryFunctionName: 'evaluateGizmo',
      parameterBinding: paramLayout
    }));

    ///////////////////////////////////////////////////////////

    var getParentXfo = function() {
      if (parentNode.pub.isTypeOf('Transform')) {
        return parentNode.pub.globalXfo;
      }else {
        return parentNode.pub.getData(parentMember, parentMemberIndex);
      }
    }

    var getTargetXfo = function() {
      if (targetNode.pub.isTypeOf('CharacterVariables')) {
        return targetNode.pub.getData(targetMember, targetMemberIndex);
      }
      else {
        return targetNode.pub[targetMember];
      }
    }

    var setTargetXfo = function(xfo) {
      if (targetNode.pub.isTypeOf('CharacterVariables')) {
        targetNode.pub.setData(targetMember, xfo, targetMemberIndex);
      }
      else {
        targetNode.pub[targetMember] = xfo;
      }
    }

    var setTargetOri = function(ori) {
      var xfo = getTargetXfo();
      xfo.ori = ori;
      setTargetXfo(xfo);
    }

    var manipulatorNode = scene.constructNode('Instance', {
          name: options.name,
          enableRaycasting: true,
          geometryNode: options.geometryNode,
          materialNode: material,
          transformNode: transformNode
        });

    manipulatorNode.getTargetNode = function() {
      return targetNode;
    };
    manipulatorNode.getTargetMember = function() {
      return targetMember;
    };
    manipulatorNode.getTargetMemberIndex = function() {
      return targetMemberIndex;
    };
    manipulatorNode.getParentNode = function() {
      return parentNode;
    };
    manipulatorNode.getParentMember = function() {
      return parentMember;
    };
    manipulatorNode.getParentMemberIndex = function() {
      return parentMemberIndex;
    };
    // Manipulation happens in the space of the manipulator,
    // but we are computing a new 'target space'.
    manipulatorNode.getManipulationSpaceXfo = function() {
    //  return transformNode.localXfo.multiply(this.getTargetGlobalXfo());
      return this.getTargetGlobalXfo().multiply(transformNode.localXfo);
    };
    
    manipulatorNode.getParentXfo = function() {
      return getParentXfo();
    };
    
    manipulatorNode.getTargetGlobalXfo = function() {
      var parent = getParentXfo();
      if (!compensation)
        return parent;
      var target = getTargetXfo();
      var global = parent.multiply(target);
      return global;
    };
    manipulatorNode.setTargetXfo = function(xfo) {
      setTargetXfo(xfo);
    };
    manipulatorNode.setTargetGlobalXfo = function(xfo) {
      if (!compensation) {
        setTargetXfo(xfo);
      }
      else {
        setTargetXfo(getParentXfo().multiplyInv(xfo));
      }
    };
    manipulatorNode.setTargetOri = function(ori) {
      setTargetOri(ori);
    };
    manipulatorNode.setTargetGlobalOri = function(ori) {
      if (!compensation) {
        setTargetOri(xfo);
      }
      else {
        setTargetOri(getParentXfo().ori.invert().postMultiply(ori));
      }
    };

    // setup the postdescend operators for disable and enable zbuffer
    // PT - This could be done at the shader/material stage
    if (options.disableZBuffer) {
      manipulatorNode.getRedrawEventHandler().postDescendBindings.insert(scene.constructOperator({
          operatorName: 'disableZBuffer',
          srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/drawAttributes.kl',
          entryFunctionName: 'disableZBuffer',
          parameterBinding: []
        }), 0);
      manipulatorNode.getRedrawEventHandler().postDescendBindings.append(scene.constructOperator({
          operatorName: 'popAttribs',
          srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/drawAttributes.kl',
          entryFunctionName: 'popAttribs',
          parameterBinding: []
        }));
    }

    manipulatorNode.pub.addEventListener('mouseover_geom', function(evt) {
        material.color = highlightColor;
        evt.viewportNode.redraw();
      });
    manipulatorNode.pub.addEventListener('mouseout_geom', function(evt) {
        material.color = color;
        evt.viewportNode.redraw();
      });

    var mouseDownScreenPos, mouseDrag, viewportNode;
    var dragFn = function(evt) {
      evt.mouseDownScreenPos = mouseDownScreenPos;
      evt.mouseDragScreenPos = FABRIC.RT.vec2(evt.screenX, evt.screenY);
      evt.mouseDragScreenDelta = evt.mouseDragScreenPos.subtract(mouseDownScreenPos);
      manipulatorNode.pub.fireEvent('drag', evt);
      evt.stopPropagation();
      viewportNode.redraw();
    }
    var releaseFn = function(evt) {
      manipulatorNode.pub.fireEvent('dragend', evt);
      document.removeEventListener('mousemove', dragFn, true);
      document.removeEventListener('mouseup', releaseFn, true);
      evt.stopPropagation();
      viewportNode.redraw();
    }
    manipulatorNode.pub.addEventListener('mousedown_geom', function(evt) {
        viewportNode = evt.viewportNode;
        evt.mouseDownScreenPos = mouseDownScreenPos = FABRIC.RT.vec2(evt.screenX, evt.screenY);
        manipulatorNode.pub.fireEvent('dragstart', evt);
        document.addEventListener('mousemove', dragFn, true);
        document.addEventListener('mouseup', releaseFn, true);
        evt.stopPropagation();
        viewportNode.redraw();
      });
    
    manipulatorNode.findClosestLocalAxis = function(vec) {
      var manipulationSpaceOri = this.getManipulationSpaceXfo().ori,
        localX = manipulationSpaceOri.rotateVector(FABRIC.RT.vec3(1, 0, 0)),
        localY = manipulationSpaceOri.rotateVector(FABRIC.RT.vec3(0, 1, 0)),
        localZ = manipulationSpaceOri.rotateVector(FABRIC.RT.vec3(0, 0, 1)),
        deltaX = vec.getAngleTo(localX),
        deltaY = vec.getAngleTo(localY),
        deltaZ = vec.getAngleTo(localZ);

      if (deltaX > 90.0) {
        deltaX = 180 - deltaX;
        localX.negateInPlace();
      }
      if (deltaY > 90.0) {
        deltaY = 180 - deltaY;
        localY.negateInPlace();
      }
      if (deltaZ > 90.0) {
        deltaZ = 180 - deltaZ;
        localZ.negateInPlace();
      }
      if (deltaX < deltaY && deltaX < deltaZ) {
        return localX;
      }
      else if (deltaY < deltaX && deltaY < deltaZ) {
        return localY;
      }
      return localZ;
    }

    return manipulatorNode;
  });


FABRIC.SceneGraph.registerNodeType('RotationManipulator',
  function(options, scene) {
    scene.assignDefaults(options, {
        rotateRate: 0.35,
        radius: 15,
        name: 'RotationManipulator'
      });

    options.geometryNode = options.geometryNode ? options.geometryNode : scene.pub.constructNode('Circle', {
                                                                            radius: options.radius });

    var manipulatorNode = scene.constructNode('Manipulator', options);


    var viewportNode;
    var dragStartXFo, vec1, angle, ray1, ray2, planePoint, planeNormal, hitPoint1, hitPoint2;
    var dragStartFn = function(evt) {
      viewportNode = evt.viewportNode;
      dragStartXFo = manipulatorNode.getTargetGlobalXfo();
      ray1 = evt.rayData;

      planePoint = dragStartXFo.tr;
      planeNormal = manipulatorNode.getManipulationSpaceXfo().ori.getYaxis();
      hitPoint1 = ray1.intersectPlane(planePoint, planeNormal).point;
      angle = 0;
      vec1 = hitPoint1.subtract(planePoint).unit();
    }
    manipulatorNode.pub.addEventListener('dragstart', dragStartFn);

    var dragFn = function(evt) {
      ray2 = viewportNode.calcRayFromMouseEvent(evt);

      hitPoint2 = ray2.intersectPlane(planePoint, planeNormal).point;
      if (!hitPoint2)
        return;

      var vec2 = hitPoint2.subtract(planePoint).unit();
      var deltaAngle = vec1.getAngleTo(vec2);
      if (vec1.cross(vec2).dot(planeNormal) > 0) {
        angle += deltaAngle;
      }else {
        angle -= deltaAngle;
      }
      vec1 = vec2;
      var dragXfo = dragStartXFo.clone();
      dragXfo.ori.postMultiplyInPlace(FABRIC.RT.Quat.makeFromAxisAndAngle(planeNormal, angle));
      manipulatorNode.setTargetGlobalXfo(dragXfo);
    }
    manipulatorNode.pub.addEventListener('drag', dragFn);

    var dragendFn = function(evt) {
    }
    manipulatorNode.pub.addEventListener('dragend', dragendFn);

    return manipulatorNode;
  });


FABRIC.SceneGraph.registerNodeType('3AxisRotationManipulator',
  function(options, scene) {
    scene.assignDefaults(options, {
        trackRate: 0.1,
        orbitRate: 0.25,
        radius: 15,
        xaxis: true,
        yaxis: true,
        zaxis: true
      });

    var circle = scene.pub.constructNode('Circle', { radius: options.radius });

    var xaxisGizmoNode = scene.pub.constructNode('RotationManipulator', scene.assignDefaults(options, {
        name: 'XAxisRotationManipulator',
        color: FABRIC.RT.rgb(0.8, 0, 0, 1),
        localXfo: new FABRIC.RT.Xfo(FABRIC.RT.Quat.makeFromAxisAndAngle(FABRIC.RT.vec3(0, 0, 1), -90)),
        geometryNode: circle
      }, true));
    var yaxisGizmoNode = scene.pub.constructNode('RotationManipulator', scene.assignDefaults(options, {
        name: 'YAxisRotationManipulator',
        color: FABRIC.RT.rgb(0, 0.8, 0, 1),
        localXfo: new FABRIC.RT.Xfo(),
        geometryNode: circle
      }, true));
    var zaxisGizmoNode = scene.pub.constructNode('RotationManipulator', scene.assignDefaults(options, {
        name: 'ZAxisRotationManipulator',
        color: FABRIC.RT.rgb(0, 0, 0.8, 1),
        localXfo: new FABRIC.RT.Xfo(FABRIC.RT.Quat.makeFromAxisAndAngle(FABRIC.RT.vec3(1, 0, 0), 90)),
        geometryNode: circle
      }, true));

    return scene.constructNode('SceneGraphNode', options);
  });

FABRIC.SceneGraph.registerNodeType('LinearTranslationManipulator',
  function(options, scene) {
    scene.assignDefaults(options, {
        size: 20,
        name: 'LinearTranslationManipulator'
      });
    if (!options.geometryNode) {
      options.geometryNode = scene.pub.constructNode('LineVector', { to: FABRIC.RT.vec3(0, options.size, 0) });
    }
    var manipulatorNode = scene.constructNode('Manipulator', options);

    var viewportNode, dragStartXFo, rotateAxis, ray1, ray2, dragStartPoint, translateAxis;
    var dragStartFn = function(evt) {
      viewportNode = evt.viewportNode;
      dragStartXFo = manipulatorNode.getTargetGlobalXfo();
      translateAxis = manipulatorNode.getManipulationSpaceXfo().ori.rotateVector(FABRIC.RT.vec3(0, 1, 0));
      ray1 = evt.rayData;
      var intersection = ray1.distanceToLine(dragStartXFo.tr, dragStartXFo.tr.add(translateAxis));
      dragStartPoint = dragStartXFo.tr.add(translateAxis.scale(intersection.lineParam));
    }
    manipulatorNode.pub.addEventListener('dragstart', dragStartFn);

    var dragFn = function(evt) {
      ray2 = viewportNode.calcRayFromMouseEvent(evt);
      var intersection = ray2.distanceToLine(dragStartXFo.tr, dragStartXFo.tr.add(translateAxis));
      var dragPoint = dragStartXFo.tr.add(translateAxis.scale(intersection.lineParam));
      var distance = dragPoint.subtract(dragStartPoint).dot(translateAxis);
      var dragXfo = dragStartXFo.clone();
      dragXfo.tr.addInPlace(translateAxis.scale(distance));
      manipulatorNode.setTargetGlobalXfo(dragXfo);
    }
    manipulatorNode.pub.addEventListener('drag', dragFn);

    return manipulatorNode;
  });


FABRIC.SceneGraph.registerNodeType('PlanarTranslationManipulator',
  function(options, scene) {
    scene.assignDefaults(options, {
        size: 15,
        name: 'PlanarTranslationManipulator'
      });
    if (!options.geometryNode) {
      // Draw a simple triangle on the XY plane
      options.geometryNode = scene.pub.constructNode('Triangles');
      options.geometryNode.loadGeometryData({
          positions: [FABRIC.RT.vec3(0, 0, 0), FABRIC.RT.vec3(0, 0, options.size),
                      FABRIC.RT.vec3(options.size, 0, 0)],
          indices: [0, 1, 2]
        });
    }
    var manipulatorNode = scene.constructNode('Manipulator', options);

    var viewportNode;
    var dragStartXFo, vec1, ray1, ray2, planePoint, planeNormal, hitPoint1, hitPoint2;
    var dragStartFn = function(evt) {
      viewportNode = evt.viewportNode;
      dragStartXFo = manipulatorNode.getTargetGlobalXfo();
      ray1 = evt.rayData;
      planePoint = dragStartXFo.tr;
      planeNormal = manipulatorNode.getManipulationSpaceXfo().ori.rotateVector(FABRIC.RT.vec3(0, 1, 0));
      hitPoint1 = ray1.intersectPlane(planePoint, planeNormal).point;
    }
    manipulatorNode.pub.addEventListener('dragstart', dragStartFn);

    var dragFn = function(evt) {
      ray2 = viewportNode.calcRayFromMouseEvent(evt);
      hitPoint2 = ray2.intersectPlane(planePoint, planeNormal).point;
      if (!hitPoint2)
        return;
      var delta = hitPoint2.subtract(hitPoint1);
      var dragXfo = dragStartXFo.clone();
      dragXfo.tr.addInPlace(delta);
      manipulatorNode.setTargetGlobalXfo(dragXfo);
    }
    manipulatorNode.pub.addEventListener('drag', dragFn);

    return manipulatorNode;
  });

FABRIC.SceneGraph.registerNodeType('ScreenTranslationManipulator',
  function(options, scene) {
    scene.assignDefaults(options, {
        radius: 0.5,
        name: 'ScreenTranslationManipulator'
      });
    options.disableZBuffer = true;

    if (!options.geometryNode) {
      options.geometryNode = scene.pub.constructNode('Sphere', {radius: options.radius, detail: 8.0});
    }
    var manipulatorNode = scene.constructNode('Manipulator', options);

    var viewportNode;
    var dragStartXFo, vec1, ray1, ray2, planePoint, planeNormal, hitPoint1, hitPoint2;
    var dragStartFn = function(evt) {
      viewportNode = evt.viewportNode;
      dragStartXFo = manipulatorNode.getTargetGlobalXfo();
      ray1 = evt.rayData;
      planePoint = dragStartXFo.tr;
      planeNormal = evt.cameraNode.getTransformNode().globalXfo.ori.rotateVector(FABRIC.RT.vec3(0, 0, 1));
      hitPoint1 = ray1.intersectPlane(planePoint, planeNormal).point;
    }
    manipulatorNode.pub.addEventListener('dragstart', dragStartFn);

    var dragFn = function(evt) {
      ray2 = viewportNode.calcRayFromMouseEvent(evt);
      hitPoint2 = ray2.intersectPlane(planePoint, planeNormal).point;
      if (!hitPoint2)
        return;
      var delta = hitPoint2.subtract(hitPoint1);
      var dragXfo = dragStartXFo.clone();
      dragXfo.tr.addInPlace(delta);
      manipulatorNode.setTargetGlobalXfo(dragXfo);
    }
    manipulatorNode.pub.addEventListener('drag', dragFn);

    return manipulatorNode;
  });

FABRIC.SceneGraph.registerNodeType('3AxisTranslationManipulator',
  function(options, scene) {
    scene.assignDefaults(options, {
        trackRate: 0.1,
        size: 25
      });

    var lineVector = scene.pub.constructNode('LineVector', { to: FABRIC.RT.vec3(0, options.size, 0) });
    var arrowHead = scene.pub.constructNode('Cone', { radius: options.size * 0.04, height: options.size * 0.2 });

    scene.pub.constructNode('LinearTranslationManipulator', scene.assignDefaults(options, {
        name: options.name + 'XAxis',
        color: FABRIC.RT.rgb(0.8, 0, 0, 1),
        localXfo: new FABRIC.RT.Xfo({
          ori: FABRIC.RT.Quat.makeFromAxisAndAngle(FABRIC.RT.vec3(0, 0, 1), -90)
        }),
        geometryNode: lineVector
      }, true));
    scene.pub.constructNode('LinearTranslationManipulator', scene.assignDefaults(options, {
        name: options.name + 'XAxisArrowHead',
        color: FABRIC.RT.rgb(0.8, 0, 0, 1),
        localXfo: FABRIC.RT.xfo({
          ori: FABRIC.RT.Quat.makeFromAxisAndAngle(FABRIC.RT.vec3(0, 0, 1), -90),
          tr: FABRIC.RT.vec3(options.size, 0, 0)
        }),
        geometryNode: arrowHead
      }, true));

    scene.pub.constructNode('LinearTranslationManipulator', scene.assignDefaults(options, {
        name: options.name + 'YAxis',
        color: FABRIC.RT.rgb(0, 0.8, 0),
        localXfo: new FABRIC.RT.Xfo(),
        geometryNode: lineVector
      }, true));
    scene.pub.constructNode('LinearTranslationManipulator', scene.assignDefaults(options, {
        name: options.name + 'YAxisArrowHead',
        color: FABRIC.RT.rgb(0, 0.8, 0),
        localXfo: FABRIC.RT.xfo({
          tr: FABRIC.RT.vec3(0, options.size, 0)
        }),
        geometryNode: arrowHead
      }, true));

    scene.pub.constructNode('LinearTranslationManipulator', scene.assignDefaults(options, {
        name: options.name + 'ZAxis',
        color: FABRIC.RT.rgb(0, 0, 0.8),
        localXfo: new FABRIC.RT.Xfo({
          ori: FABRIC.RT.Quat.makeFromAxisAndAngle(FABRIC.RT.vec3(1, 0, 0), 90)
        }),
        geometryNode: lineVector
      }, true));
    scene.pub.constructNode('LinearTranslationManipulator', scene.assignDefaults(options, {
        name: options.name + 'ZAxisArrowHead',
        color: FABRIC.RT.rgb(0, 0, 0.8),
        localXfo: FABRIC.RT.xfo({
          ori: FABRIC.RT.Quat.makeFromAxisAndAngle(FABRIC.RT.vec3(1, 0, 0), 90),
          tr: FABRIC.RT.vec3(0, 0, options.size)
        }),
        geometryNode: arrowHead
      }, true));

    var drawTriangle = scene.pub.constructNode('Triangles');
    drawTriangle.loadGeometryData({
        positions: [FABRIC.RT.vec3(0, 0, 0), FABRIC.RT.vec3(0, 0, options.size * 0.6),
                    FABRIC.RT.vec3(options.size * 0.6, 0, 0), FABRIC.RT.vec3(0, 0, 0),
                    FABRIC.RT.vec3(0, 0, options.size * 0.6), FABRIC.RT.vec3(options.size * 0.6, 0, 0)],
        indices: [0, 1, 2, 3, 5, 4]
      });

    scene.pub.constructNode('PlanarTranslationManipulator', scene.assignDefaults(options, {
        name: 'YZPlaneTranslationManipulator',
        color: FABRIC.RT.rgb(0.8, 0, 0, 1),
        localXfo: new FABRIC.RT.Xfo({
          ori: FABRIC.RT.Quat.makeFromAxisAndAngle(FABRIC.RT.vec3(0, 0, 1), 90)
        }),
        geometryNode: drawTriangle
      }, true));
    scene.pub.constructNode('PlanarTranslationManipulator', scene.assignDefaults(options, {
        name: 'XZPlaneTranslationManipulator',
        color: FABRIC.RT.rgb(0, 0.8, 0, 1),
        localXfo: new FABRIC.RT.Xfo(),
        geometryNode: drawTriangle
      }, true));
    scene.pub.constructNode('PlanarTranslationManipulator', scene.assignDefaults(options, {
        name: 'XYPlaneTranslationManipulator',
        color: FABRIC.RT.rgb(0, 0, 0.8, 1),
        localXfo: new FABRIC.RT.Xfo({
          ori: FABRIC.RT.Quat.makeFromAxisAndAngle(FABRIC.RT.vec3(1, 0, 0), -90)
        }),
        geometryNode: drawTriangle
      }, true));

    return scene.constructNode('SceneGraphNode', options);
  });


FABRIC.SceneGraph.registerNodeType('PivotRotationManipulator',
  function(options, scene) {
    scene.assignDefaults(options, {
        rotateRate: 0.35,
        radius: 15,
        name: 'RotationManipulator'
      });

    options.geometryNode = options.geometryNode ? options.geometryNode :
      scene.pub.constructNode('Circle', { radius: options.radius });

    var manipulatorNode = scene.constructNode('Manipulator', options);

    var viewportNode;
    var dragStartXFo, vec1, ray1, ray2, planePoint, planeNormal, hitPoint1;
    var pivotPoint, hitPoint2, localAxis, globalAxis;
    var dragStartFn = function(evt) {
      viewportNode = evt.viewportNode;
      dragStartXFo = manipulatorNode.getTargetGlobalXfo();
      ray1 = evt.rayData;

      planePoint = dragStartXFo.tr;
      planeNormal = ray1.direction.negate();
      localAxis = manipulatorNode.findClosestLocalAxis(ray1.direction);
    }
    manipulatorNode.pub.addEventListener('dragstart', dragStartFn);

    var dragFn = function(evt) {
      var vec2,
        angle,
        movement,
        dragXfo,
        normal;

      ray2 = viewportNode.calcRayFromMouseEvent(evt);
      if (evt.ctrlKey) {
        normal = planeNormal;
        hitPoint1 = ray1.intersectPlane(planePoint, planeNormal).point;
        hitPoint2 = ray2.intersectPlane(planePoint, planeNormal).point;
        pivotPoint = planePoint.add(planePoint.subtract(hitPoint1));
        vec1 = hitPoint1.subtract(pivotPoint).unit();
      }
      else {
        normal = localAxis;
        hitPoint1 = ray1.intersectPlane(planePoint, localAxis).point;
        hitPoint2 = ray2.intersectPlane(planePoint, localAxis).point;
        pivotPoint = planePoint.add(planePoint.subtract(hitPoint1));
        vec1 = hitPoint1.subtract(pivotPoint).unit();
      }
      if (!hitPoint2)
        return;

      vec2 = hitPoint2.subtract(pivotPoint).unit();
      angle = vec1.getAngleTo(vec2);

      if (evt.shiftKey) {
        angle = Math.round(angle / 5.0) * 5.0;
      }

      movement = vec2.subtract(vec1).unit().scale(Math.sin(angle * 0.5 * FABRIC.RT.degToRad) * options.radius * 2.0);
      if (vec1.cross(vec2).dot(normal) < 0) {
        angle = -angle;
        movement.negate();
      }

      dragXfo = dragStartXFo.clone();
      dragXfo.ori.postMultiplyInPlace(FABRIC.RT.Quat.makeFromAxisAndAngle(normal, angle));
      dragXfo.tr.addInPlace(movement);
      manipulatorNode.setTargetGlobalXfo(dragXfo);
    }
    manipulatorNode.pub.addEventListener('drag', dragFn);

    var dragendFn = function(evt) {
    }
    manipulatorNode.pub.addEventListener('dragend', dragendFn);

    return manipulatorNode;
  });




FABRIC.SceneGraph.registerNodeType('BoneManipulator',
  function(options, scene) {
    scene.assignDefaults(options, {
        name: 'BoneManipulator',
        parentManipulator: undefined,
        childManipulator: undefined,
        length: 35,
        boneVector: FABRIC.RT.vec3(1, 0, 0)
      });
    
    options.geometryNode = scene.pub.constructNode('LineVector', { to: options.boneVector.scale(options.length) });
    options.compensation = false;
    
    var manipulatorNode = scene.constructNode('Manipulator', options),
      parentManipulator = options.parentManipulator,
      childManipulator = options.childManipulator,
      viewportNode,
      dragStartXFo, vec1, ray1, ray2, planePoint, planeNormal, hitPoint1, hitPoint2, localAxis, globalAxis,
      currDragHandlerFn, dragXfo;

    var dragStartFn = function(evt) {
      viewportNode = evt.viewportNode;
      dragStartXFo = manipulatorNode.getTargetGlobalXfo();
      ray1 = evt.rayData;

      planePoint = dragStartXFo.tr;
      planeNormal = ray1.direction.negate();
      localAxis = manipulatorNode.findClosestLocalAxis(ray1.direction);

      vec1 = manipulatorNode.getManipulationSpaceXfo().ori.rotateVector(options.boneVector);
      currDragHandlerFn = dragHandlerFn;

      if (parentManipulator) {
        parentManipulator.beginManipulation(manipulatorNode);
      }
      if (childManipulator) {
        childManipulator.beginManipulation(manipulatorNode);
      }
    };
var redFlatMaterial = scene.constructNode('FlatMaterial', {
    color: FABRIC.RT.rgb(0.8, 0, 0)
  }).pub;
    var dragHandlerFn = function(evt, ray) {
      var dragVec,
        vec2,
        angle,
        movement,
        dragXfo,
        normal,
        dist,
        lengthRatio = 0,
        translationRatio = 0;
      ray2 = ray;
      if (evt.ctrlKey) {
        normal = localAxis;
        hitPoint2 = ray2.intersectPlane(planePoint, localAxis).point;
      }
      else {
        normal = planeNormal;
        hitPoint2 = ray2.intersectPlane(planePoint, planeNormal).point;
      }
      
      dragVec = hitPoint2.subtract(planePoint);
      vec1 = normal.cross(vec1.cross(normal)).unit();

      dist = dragVec.length();
      lengthRatio = (dist-(options.length* 0.2))/(options.length * 0.6);
      lengthRatio = 0;//(lengthRatio < 0.0 ? 0.0 : (lengthRatio > 1.0 ? 1.0 : lengthRatio));
      translationRatio = (Math.cos(lengthRatio * Math.PI * 0.5) + 1.0) * 0.5;
      /*
        // Cross
  scene.constructNode('Instance', {
      transformNode: scene.constructNode('Transform', {
        hierarchical: false,
        globalXfo: FABRIC.RT.xfo({ tr: planePoint.add(vec1) })
      }).pub,
      geometryNode: scene.constructNode('Cross', {
        size: 7.0
      }).pub,
      materialNode: redFlatMaterial
    });
      */
      var angle1 = -(vec1.negate().getAngleTo(hitPoint2.subtract(planePoint.add(vec1.scale(options.length)))));
      var angle2 = vec1.getAngleTo(dragVec);// (1.0 - translationRatio);
      angle = angle1;

      if (evt.shiftKey) {
        angle = Math.round(angle / 5.0) * 5.0;
      }

      if (vec1.cross(dragVec).dot(normal) < 0) {
        angle = -angle;
      }
      
      dragXfo = dragStartXFo.clone();
      dragXfo.ori.postMultiplyInPlace(FABRIC.RT.Quat.makeFromAxisAndAngle(normal, angle));
      
      if(!parentManipulator){
        dragXfo.tr = dragVec.scale(translationRatio);
        manipulatorNode.setTargetGlobalOri(dragXfo.ori);
      }else{
        movement = dragVec.scale(translationRatio);
        var parentXfo = parentManipulator.counterRotateParent(movement);
        manipulatorNode.setTargetOri(dragXfo.multiply(parentXfo.invert()).ori);
        dragXfo.tr = parentXfo.tr;
      }
      
      if (childManipulator) {
        movement = dragXfo.tr.add(dragXfo.ori.rotateVector(options.boneVector).scale(options.length)).subtract(
              dragStartXFo.tr.add(dragStartXFo.ori.rotateVector(options.boneVector).scale(options.length)));
        childManipulator.counterRotateChild(movement, dragXfo);

        if (dist > options.length) {
          // At this point we want to start passing the events to the child
          // Manipulator. This Manipulator will recieve the events, but will
          // pass them on directly.
    //      childManipulator.beginManipulation(planeNormal, localAxis);
    //      currDragHandlerFn = childManipulator.getDragHandlerFn();
        }
      }

    };
    
    var dragFn = function(evt) {
      currDragHandlerFn(evt, viewportNode.calcRayFromMouseEvent(evt));
    };

    var dragendFn = function(evt) {
    };

    // Private
    manipulatorNode.beginManipulation = function(chainedManipulator) {
      dragStartXFo = manipulatorNode.getTargetGlobalXfo();
      vec1 = this.getManipulationSpaceXfo().ori.rotateVector(options.boneVector);

      if (parentManipulator && parentManipulator !== chainedManipulator) {
        parentManipulator.beginManipulation(manipulatorNode);
      }
      if (childManipulator && childManipulator !== chainedManipulator) {
        childManipulator.beginManipulation(manipulatorNode);
      }
    };
    
    manipulatorNode.counterRotateParent = function(movement) {
      var dragXfo = dragStartXFo.clone(),
        newVec1 = movement.add(vec1.scale(options.length)),
        newVec1Length = newVec1.norm(),
        counterRotation = FABRIC.RT.Quat.makeFrom2Vectors(vec1, newVec1.scale(1.0 / newVec1Length));

      dragXfo.ori.postMultiplyInPlace(counterRotation);
      this.setTargetGlobalOri(dragXfo.ori);
      dragXfo.tr.addInPlace(dragXfo.ori.rotateVector(options.boneVector).scale(options.length));
      return dragXfo;
    };
    manipulatorNode.counterRotateChild = function(movement, parentXfo) {
      var dragXfo = dragStartXFo.clone(),
        newVec1 = movement.add(vec1.scale(-options.length)),
        newVec1Length = newVec1.norm(),
        counterRotation = FABRIC.RT.Quat.makeFrom2Vectors(vec1.negate(), newVec1.scale(1.0 / newVec1Length));

      dragXfo.tr.addInPlace(movement);
      dragXfo.ori.postMultiplyInPlace(counterRotation);
      this.setTargetOri(dragXfo.ori.postMultiply(parentXfo.ori.invert()));
     // this.setTargetOri(parentXfo.multiplyInv(dragXfo).ori);

      if (childManipulator) {
        childManipulator.counterRotateChild(newVec1.scale((newVec1Length - options.length) / newVec1Length), dragXfo);
      }
    };
    
    manipulatorNode.getDragHandlerFn = function() {
      return dragHandlerFn;
    };

    manipulatorNode.pub.addEventListener('dragstart', dragStartFn);
    manipulatorNode.pub.addEventListener('drag', dragFn);
    manipulatorNode.pub.addEventListener('dragend', dragendFn);
    
    manipulatorNode.setParentManipulatorNode = function(node) {
      if (!node.isTypeOf('BoneManipulator')) {
        throw ('Incorrect type assignment. Must assign a BoneManipulator');
      }
      parentManipulator = scene.getPrivateInterface(node);
    };
    manipulatorNode.setChildManipulatorNode = function(node) {
      if (!node.isTypeOf('BoneManipulator')) {
        throw ('Incorrect type assignment. Must assign a BoneManipulator');
      }
      childManipulator = scene.getPrivateInterface(node);
    };
    manipulatorNode.getBoneLength = function() {
      return options.length;
    }

    return manipulatorNode;
  });



