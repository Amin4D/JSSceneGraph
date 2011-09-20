
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//

FABRIC.SceneGraph.registerNodeType('CameraManipulator', {
  briefDesc: 'The CameraManipulator is a basic tool for controling viewport cameras.',
  detailedDesc: 'The CameraManipulator is a basic tool for controling viewport cameras.' +
                'Camera manipulation is controlled with the mouse. ' +
                'The Left mouse button is used to orbit the camera. ' +
                'The Middle mouse button is used to pan the camera. ' +
                'The Right mouse button is used to zoom the camera. ',
  parentNodeDesc: 'SceneGraphNode',
  optionsDesc: {
    mouseWheelZoomRate: 'The rate at which the camera will zoom when the mouse wheel it manipulated',
    mouseDragZoomRate: 'The rate at which the camera will zoom when the mouse is dragged with the right mouse button held down',
    orbitRate: 'The rate at which the camera will orbit when the mouse is dragged with the left mouse button held down',
    enabled: 'The manipulator can be disabled, thereby allowing other manipulators to operate.'
  },
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
        mouseWheelZoomRate: 0.3,
        mouseDragZoomRate:0.001,
        orbitRate: 0.005,
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
      var zoomDist = cameraNode.getFocalDistance() * options.mouseWheelZoomRate * evt.wheelDelta * -0.001;
      var cameraXfo = cameraNode.getTransformNode().getGlobalXfo();
      var cameraZoom = cameraXfo.ori.getZaxis().mulInPlace(zoomDist);
      cameraXfo.tr.addInPlace(cameraZoom);
      cameraNode.getTransformNode().setGlobalXfo(cameraXfo);
      if (!cameraNode.getTransformNode().getTarget) {
        cameraNode.setFocalDistance(cameraNode.getFocalDistance() - zoomDist);
      }
      evt.viewportNode.redraw();
      evt.stopPropagation();
    }
    cameraNode.addEventListener('mousewheel', mouseWheelZoomFn);

    var cameraPos, cameraTarget, cameraOffset, cameraXfo, upaxis, swaxis, focalDist;
    var mouseDownScreenPos, viewportNode;
    var getCameraValues = function(evt) {
      mouseDownScreenPos = FABRIC.RT.vec2(evt.screenX, evt.screenY);
      viewportNode = evt.viewportNode;
      cameraXfo = evt.cameraNode.getTransformNode().getGlobalXfo();
      cameraPos = cameraXfo.tr;
      swaxis = cameraXfo.ori.getXaxis();
      upaxis = cameraXfo.ori.getYaxis();

      focalDist = evt.cameraNode.getFocalDistance();
      cameraOffset = cameraXfo.ori.getZaxis().scale(-focalDist);
      cameraTarget = cameraPos.add(cameraOffset);
    }
    var mouseDownFn = function(evt) {
      if(!enabled){
        return;
      }
      if (evt.button === 0) {
        getCameraValues(evt);
        document.addEventListener('mousemove', dragOrbitFn, false);
        document.addEventListener('mouseup', releaseOrbitFn, false);
        evt.stopPropagation();
      }
      else if (evt.button === 1) {
        getCameraValues(evt);
        document.addEventListener('mousemove', dragPanFn, false);
        document.addEventListener('mouseup', releasePanFn, false);
        evt.stopPropagation();
      }
      else if (evt.button === 2) {
        getCameraValues(evt);
        document.addEventListener('mousemove', dragZoomFn, false);
        document.addEventListener('mouseup', releaseZoomFn, false);
        evt.stopPropagation();
      }
    }
    cameraNode.addEventListener('mousedown', mouseDownFn);

    var dragOrbitFn = function(evt) {
      if(!enabled){
        return;
      }
      var mouseDragScreenPos = FABRIC.RT.vec2(evt.screenX, evt.screenY);
      var mouseDragScreenDelta = mouseDownScreenPos.subtract(mouseDragScreenPos);
      var newcameraXfo = cameraXfo.clone();
      var arbit = FABRIC.RT.Quat.makeFromAxisAndAngle(FABRIC.RT.vec3(0,1,0), mouseDragScreenDelta.x * options.orbitRate);
      newcameraXfo.ori.postMultiplyInPlace(arbit);
      
      var pitch = FABRIC.RT.Quat.makeFromAxisAndAngle(newcameraXfo.ori.getXaxis(), mouseDragScreenDelta.y * options.orbitRate);
      newcameraXfo.ori.postMultiplyInPlace(pitch);
      
      var newCameraOffset = arbit.rotateVector(cameraOffset);
      newCameraOffset = pitch.rotateVector(newCameraOffset);
      newcameraXfo.tr = cameraTarget.subtract(newCameraOffset);
      
      cameraNode.getTransformNode().setGlobalXfo(newcameraXfo);
      viewportNode.redraw(true);
      evt.stopPropagation();
    }

    var releaseOrbitFn = function(evt) {
      viewportNode.redraw();
      document.removeEventListener('mousemove', dragOrbitFn, false);
      document.removeEventListener('mouseup', releaseOrbitFn, false);
      evt.stopPropagation();
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
      cameraNode.getTransformNode().setGlobalXfo(newcameraXfo);
      if (cameraNode.getTransformNode().getTarget) {
        cameraNode.getTransformNode().setTarget(cameraTarget.add(dragDist));
      }
      viewportNode.redraw(true);
      evt.stopPropagation();
    }
    var releasePanFn = function(evt) {
      viewportNode.redraw();
      document.removeEventListener('mousemove', dragPanFn, false);
      document.removeEventListener('mouseup', releasePanFn, false);
      evt.stopPropagation();
    }


    var dragZoomFn = function(evt) {
      if(!enabled){
        return;
      }
      var mouseDragScreenDelta = evt.screenX - mouseDownScreenPos.x;
      
      var zoomDist = cameraNode.getFocalDistance() * -options.mouseDragZoomRate * mouseDragScreenDelta;
      var newcameraXfo = cameraXfo.clone();
      var cameraZoom = cameraXfo.ori.getZaxis().mulInPlace(zoomDist);
      newcameraXfo.tr.addInPlace(cameraZoom);
      cameraNode.getTransformNode().setGlobalXfo(newcameraXfo);
      if (!cameraNode.getTransformNode().getTarget) {
        cameraNode.setFocalDistance(cameraNode.getFocalDistance() - zoomDist);
      }
      viewportNode.redraw(true);
      evt.stopPropagation();
    }
    var releaseZoomFn = function(evt) {
      viewportNode.redraw();
      document.removeEventListener('mousemove', dragZoomFn, false);
      document.removeEventListener('mouseup', releaseZoomFn, false);
      evt.stopPropagation();
    }

    return cameraManipulatorNode;
  }});


FABRIC.SceneGraph.registerNodeType('PaintManipulator', {
  briefDesc: 'The PaintManipulator collects points using a brush.',
  detailedDesc: 'Paint manipulators can be used to modify many vertex attributes at once.',
  parentNodeDesc: 'SceneGraphNode',
  optionsDesc: {
    brushSize: 'The radius of the brush',
    brushScaleSpeed: 'The mouse wheeel is used to modify the brush radius, and this paramter controls how fast the bush is resized',
    enabled: 'Toggle controlling whther this manipulator traps events.'
  },
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
      brushSize: 0.1,
      brushScaleSpeed: 1.0,
      enabled:true
      });

    var paintManipulatorNode = scene.constructNode('SceneGraphNode', options),
      paintEventHandler = paintManipulatorNode.constructEventHandlerNode('Paint'),
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
    
    paintEventHandler.addMember('cameraMatrix', 'Mat44');
    paintEventHandler.addMember('projectionMatrix', 'Mat44');
    paintEventHandler.addMember('aspectRatio', 'Scalar');
    paintEventHandler.addMember('brushPos', 'Vec3');
    
    paintEventHandler.addMember('brushSize', 'Scalar', options.brushSize);
    paintManipulatorNode.addMemberInterface(paintEventHandler, 'brushSize', true);

    paintEventHandler.setScopeName('paintData');

    // Raycast events are fired from the viewport. As the event
    // propagates down the tree it collects scopes and fires operators.
    // The operators us the collected scopes to calculate the ray.
    paintEvent = paintManipulatorNode.constructEventNode('Event');
    paintEvent.appendEventHandler(paintEventHandler);
    
    var brushMaterial = scene.constructNode('FlatScreenSpaceMaterial', { color: FABRIC.RT.rgb(0.8, 0, 0) });
    var brushShapeTransform = scene.constructNode('Transform', { hierarchical: false, globalXfo: FABRIC.RT.xfo({
        ori: FABRIC.RT.Quat.makeFromAxisAndAngle(FABRIC.RT.vec3(1, 0, 0), Math.degToRad(90)),
        sc: FABRIC.RT.vec3(0, 0, 0)
      }) });
    var brushInstance = scene.constructNode('Instance', {
        transformNode: brushShapeTransform.pub,
        geometryNode: scene.constructNode('Circle', { radius: 1.0 }).pub,
        materialNode: brushMaterial.pub,
        enableDrawing: false
      });

    var collectPoints = function() {
      paintEventHandler.setData('brushPos', brushPos);
      paintEventHandler.setData('cameraMatrix', cameraMatrix);
      paintEventHandler.setData('projectionMatrix', projectionMatrix);
      paintEventHandler.setData('aspectRatio', aspectRatio);
      return paintEvent.select('CollectedPoints');
    };

    var resizePaintBrushFn = function(evt) {
      if(!enabled){
        return;
      }
      options.brushSize += evt.wheelDelta * 0.0001 * options.brushScaleSpeed;
      options.brushSize = Math.max(options.brushSize, 0.01);
      paintEventHandler.setData('brushSize', options.brushSize);
      evt.stopPropagation();
      evt.viewportNode.redraw();
    }
    scene.pub.addEventListener('mousewheel', resizePaintBrushFn);

    var getOffset = function( el ) {
      var _x = 0;
      var _y = 0;
      while( el && !isNaN( el.offsetLeft ) && !isNaN( el.offsetTop ) ) {
          _x += el.offsetLeft - el.scrollLeft;
          _y += el.offsetTop - el.scrollTop;
          el = el.offsetParent;
      }
      return { top: _y, left: _x };
    }
    var getMousePos = function(evt) {
      if (evt.offsetX) {
        return FABRIC.RT.vec2(evt.offsetX, evt.offsetY);
      }
      else if (evt.pageY) {
        var eloffset = getOffset(evt.target);
        return FABRIC.RT.vec2(evt.pageX-eloffset.left, evt.pageY-eloffset.top);
      }
      throw("Unsupported Browser");
    }

    var moveBrush = function(evt) {
      var mousepos = getMousePos(evt);
      width = parseInt(evt.target.width, 10);
      height = parseInt(evt.target.height, 10);
      aspectRatio = width / height;
      brushPos = FABRIC.RT.vec3(((mousepos.x / width) - 0.5) * 2.0, ((mousepos.y / height) - 0.5) * -2.0, 0);

      brushShapeTransform.pub.setGlobalXfo(FABRIC.RT.xfo({
          tr: brushPos,
          ori: FABRIC.RT.Quat.makeFromAxisAndAngle(FABRIC.RT.vec3(1, 0, 0), Math.degToRad(90)),
          sc: FABRIC.RT.vec3(options.brushSize / aspectRatio, options.brushSize, options.brushSize)
        }));
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

      evt.paintData = points.length > 0 ? points[0].value : null;
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
        cameraMatrix = viewportNode.getCameraNode().getCameraMat44();
        projectionMatrix = viewportNode.getCameraNode().getProjectionMat44();

        document.addEventListener('mousemove', paintFn, false);
        document.addEventListener('mouseup', releasePaintFn, false);

        paintManipulatorNode.pub.fireEvent('onbeginpaint', evt);
        paintFn(evt);
      }
    }
    scene.pub.addEventListener('mousedown', mouseDownFn);

    var releasePaintFn = function(evt) {
      document.removeEventListener('mousemove', paintFn, false);
      document.removeEventListener('mouseup', releasePaintFn, false);
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

      paintInstanceEventHandler = paintManipulatorNode.constructEventHandlerNode('Paint' + node.getName());
      paintInstanceEventHandler.addScope('geometryattributes', geometryNode.getAttributesDGNode());
      paintInstanceEventHandler.addScope('geometryuniforms', geometryNode.getAttributesDGNode());
      paintInstanceEventHandler.addScope('transform', transformNode.getDGNode());
      paintInstanceEventHandler.addScope('instance', instanceNode.getDGNode());

      // The selector will return the node bound with the given binding name.
      var paintingOpDef = options.paintingOpDef;
      if(!paintingOpDef){
        paintingOpDef = {
          operatorName: 'collectPointsInsideBrush',
          srcFile: 'FABRIC_ROOT/SceneGraph/KL/collectPointsInsideVolume.kl',
          entryFunctionName: 'collectPointsInsideBrush',
          parameterLayout: [
            'paintData.cameraMatrix',
            'paintData.projectionMatrix',
            'paintData.aspectRatio',
  
            'paintData.brushPos',
            'paintData.brushSize',
  
            'transform.' + instanceNode.pub.getTransformNodeMember(),
            'geometryattributes.positions<>',
            'geometryattributes.normals<>'
          ],
          async: false
        };
      }
      // At this moment, the operators bindings are checked and the binding with the
      // given name is searched for. (instance). This is why the operator must be
      // constructed synchronously.
      paintInstanceEventHandler.setSelector('instance', scene.constructOperator(paintingOpDef));
      
      paintEventHandler.appendChildEventHandler(paintInstanceEventHandler);

      paintableNodes.push(instanceNode);
      paintableNodePaintHandlers.push(paintInstanceEventHandler);
    };

    paintManipulatorNode.pub.enable = function(){
      enabled = true;
      brushInstance.pub.setDrawToggle(true);
      scene.pub.redrawAllWindows();
    }
    paintManipulatorNode.pub.disable = function(){
      enabled = false;
      brushInstance.pub.setDrawToggle(false);
      scene.pub.redrawAllWindows();
    }

    return paintManipulatorNode;
  }});


FABRIC.SceneGraph.registerNodeType('Manipulator', {
  manipulating: false,
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
        targetNode: undefined,
        targetMember: undefined,
        targetMemberIndex: undefined,
        parentNode: undefined,
        parentMember: undefined,
        parentMemberIndex: undefined,
        color: FABRIC.RT.rgb(0, 0.8, 0, 1),
        highlightcolor: FABRIC.RT.rgb(0.8, 0.8, 0.8, 1),
        localXfo: new FABRIC.RT.Xfo()
      });

    var compensation = true,
      manipulating = false,
      color = options.color,
      highlightColor = options.highlightcolor,
      material = scene.pub.constructNode('FlatMaterial', { color: options.color, drawOverlayed: options.drawOverLayed });

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
    // TODO: review the following code. It seems unnecessary to
    // define functions defined in 'Transform' here. 
    var transformNode = scene.constructNode('Transform', { hierarchical: false });
    var transformDGNode = transformNode.getDGNode();
    transformDGNode.addMember('localXfo', 'Xfo', options.localXfo);
    transformNode.getLocalXfo = function() {
      return transformDGNode.getData('localXfo');
    };
    transformNode.setlocalXfo = function(val) {
      transformDGNode.setData('localXfo', 0, val);
    };

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
      srcFile: 'FABRIC_ROOT/SceneGraph/KL/evaluateGizmo.kl',
      entryFunctionName: 'evaluateGizmo',
      parameterLayout: paramLayout
    }));

    ///////////////////////////////////////////////////////////

    var getParentXfo = function() {
      if (parentNode.pub.isTypeOf('Transform')) {
        return parentNode.pub.getGlobalXfo();
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
        var targetMemberSetter = "set"+targetMember.charAt(0).toUpperCase()+targetMember.slice(1);
        var data = xfo;
        if(targetMemberIndex != undefined) {
          data = targetNode.pub['g'+targetMemberSetter.substr(1,1000)]();
          data[targetMemberIndex] = xfo;
        }
        targetNode.pub[targetMemberSetter](data);
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
      return this.getTargetGlobalXfo().multiply(transformNode.getLocalXfo());
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
    
    var manipulatorGlobals = this;
    var highlightNode = function(){
      material.setColor(highlightColor);
    }
    var unhighlightNode = function(){
      material.setColor(color);
    }
    manipulatorNode.pub.addEventListener('mouseover_geom', function(evt) {
        if(!manipulatorGlobals.manipulating){
          highlightNode();
          evt.viewportNode.redraw();
        }
      });
    manipulatorNode.pub.addEventListener('mouseout_geom', function(evt) {
        if(!manipulating){
          unhighlightNode();
          if(!evt.toElement){
            // if there is a 'toElement' then there will be a mouseover event.
            // the redraw will occur then.
            evt.viewportNode.redraw();
          }
        }
      });

    var mouseDownScreenPos, mouseDrag, viewportNode;
    var dragFn = function(evt) {
      evt.mouseDownScreenPos = mouseDownScreenPos;
      evt.mouseDragScreenPos = FABRIC.RT.vec2(evt.screenX, evt.screenY);
      evt.mouseDragScreenDelta = evt.mouseDragScreenPos.subtract(mouseDownScreenPos);
      manipulatorNode.pub.fireEvent('drag', evt);
      evt.stopPropagation();
      viewportNode.redraw(true);
    }
    var releaseFn = function(evt) {
      manipulating = false;
      manipulatorGlobals.manipulating = false;
      unhighlightNode();
      manipulatorNode.pub.fireEvent('dragend', evt);
      document.removeEventListener('mousemove', dragFn, false);
      document.removeEventListener('mouseup', releaseFn, false);
      evt.stopPropagation();
      viewportNode.redraw();
    }
    manipulatorNode.pub.addEventListener('mousedown_geom', function(evt) {
        manipulating = true;
        manipulatorGlobals.manipulating = true;
        highlightNode();
        viewportNode = evt.viewportNode;
        evt.mouseDownScreenPos = mouseDownScreenPos = FABRIC.RT.vec2(evt.screenX, evt.screenY);
        manipulatorNode.pub.fireEvent('dragstart', evt);
        document.addEventListener('mousemove', dragFn, false);
        document.addEventListener('mouseup', releaseFn, false);
        evt.stopPropagation();
        viewportNode.redraw();
      });
    
    // Thia function is used to find the closest local axis to
    // the given vec. The local axis can then be used in manipulation.
    // Manipulators can then determine the best local axis based on the
    // camera facing direction. 
    manipulatorNode.findClosestLocalAxis = function(vec) {
      var manipulationSpaceOri = this.getManipulationSpaceXfo().ori,
        localX = manipulationSpaceOri.rotateVector(FABRIC.RT.vec3(1, 0, 0)),
        localY = manipulationSpaceOri.rotateVector(FABRIC.RT.vec3(0, 1, 0)),
        localZ = manipulationSpaceOri.rotateVector(FABRIC.RT.vec3(0, 0, 1)),
        deltaX = vec.getAngleTo(localX),
        deltaY = vec.getAngleTo(localY),
        deltaZ = vec.getAngleTo(localZ);

      if (deltaX > Math.HALF_PI) {
        deltaX = Math.PI - deltaX;
        localX.negateInPlace();
      }
      if (deltaY > Math.HALF_PI) {
        deltaY = Math.PI - deltaY;
        localY.negateInPlace();
      }
      if (deltaZ > Math.HALF_PI) {
        deltaZ = Math.PI - deltaZ;
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
  }});


FABRIC.SceneGraph.registerNodeType('RotationManipulator', {
  factoryFn: function(options, scene) {
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
  }});


FABRIC.SceneGraph.registerNodeType('3AxisRotationManipulator', {
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
        trackRate: 0.1,
        orbitRate: 0.25,
        radius: 15,
        xaxis: true,
        yaxis: true,
        zaxis: true,
        name: 'ThreeAxisRotationManipulator'
      });
    
    var threeAxisRotationManipulator = scene.constructNode('SceneGraphNode', options);
    var name = threeAxisRotationManipulator.pub.getName();

    var circle = scene.pub.constructNode('Circle', { radius: options.radius });

    var xaxisGizmoNode = scene.pub.constructNode('RotationManipulator', scene.assignDefaults(options, {
        name: name + 'XAxis',
        color: FABRIC.RT.rgb(0.8, 0, 0, 1),
        localXfo: new FABRIC.RT.Xfo({ ori: FABRIC.RT.Quat.makeFromAxisAndAngle(FABRIC.RT.vec3(0, 0, 1), -Math.degToRad(90)) }),
        geometryNode: circle
      }, true));
    var yaxisGizmoNode = scene.pub.constructNode('RotationManipulator', scene.assignDefaults(options, {
        name: name + 'YAxis',
        color: FABRIC.RT.rgb(0, 0.8, 0, 1),
        localXfo: new FABRIC.RT.Xfo(),
        geometryNode: circle
      }, true));
    var zaxisGizmoNode = scene.pub.constructNode('RotationManipulator', scene.assignDefaults(options, {
        name: name + 'ZAxis',
        color: FABRIC.RT.rgb(0, 0, 0.8, 1),
        localXfo: new FABRIC.RT.Xfo({ ori: FABRIC.RT.Quat.makeFromAxisAndAngle(FABRIC.RT.vec3(1, 0, 0), Math.degToRad(90)) }),
        geometryNode: circle
      }, true));

    return threeAxisRotationManipulator;
  }});

FABRIC.SceneGraph.registerNodeType('LinearTranslationManipulator', {
  factoryFn: function(options, scene) {
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
  }});


FABRIC.SceneGraph.registerNodeType('PlanarTranslationManipulator', {
  factoryFn: function(options, scene) {
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
  }});

FABRIC.SceneGraph.registerNodeType('ScreenTranslationManipulator', {
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
        radius: 0.5,
        name: 'ScreenTranslationManipulator',
        drawOverLayed: true
      });

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
      planeNormal = evt.cameraNode.getTransformNode().getGlobalXfo().ori.rotateVector(FABRIC.RT.vec3(0, 0, 1));
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
  }});

FABRIC.SceneGraph.registerNodeType('3AxisTranslationManipulator', {
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
        trackRate: 0.1,
        size: 25,
        name: 'threeAxisTrans'
      });
    
    var threeAxisTranslationManipulator = scene.constructNode('SceneGraphNode', options);
    var name = threeAxisTranslationManipulator.pub.getName();

    var lineVector = scene.pub.constructNode('LineVector', { to: FABRIC.RT.vec3(0, options.size, 0) });
    var arrowHead = scene.pub.constructNode('Cone', { radius: options.size * 0.04, height: options.size * 0.2 });

    scene.pub.constructNode('LinearTranslationManipulator', scene.assignDefaults(options, {
        name: name + '_XAxis',
        color: FABRIC.RT.rgb(0.8, 0, 0, 1),
        localXfo: new FABRIC.RT.Xfo({
          ori: FABRIC.RT.Quat.makeFromAxisAndAngle(FABRIC.RT.vec3(0, 0, 1), -Math.degToRad(90))
        }),
        geometryNode: lineVector
      }, true));
    scene.pub.constructNode('LinearTranslationManipulator', scene.assignDefaults(options, {
        name: name + '_XAxisArrowHead',
        color: FABRIC.RT.rgb(0.8, 0, 0, 1),
        localXfo: FABRIC.RT.xfo({
          ori: FABRIC.RT.Quat.makeFromAxisAndAngle(FABRIC.RT.vec3(0, 0, 1), -Math.degToRad(90)),
          tr: FABRIC.RT.vec3(options.size, 0, 0)
        }),
        geometryNode: arrowHead
      }, true));

    scene.pub.constructNode('LinearTranslationManipulator', scene.assignDefaults(options, {
        name: name + '_YAxis',
        color: FABRIC.RT.rgb(0, 0.8, 0),
        localXfo: new FABRIC.RT.Xfo(),
        geometryNode: lineVector
      }, true));
    scene.pub.constructNode('LinearTranslationManipulator', scene.assignDefaults(options, {
        name: name + '_YAxisArrowHead',
        color: FABRIC.RT.rgb(0, 0.8, 0),
        localXfo: FABRIC.RT.xfo({
          tr: FABRIC.RT.vec3(0, options.size, 0)
        }),
        geometryNode: arrowHead
      }, true));

    scene.pub.constructNode('LinearTranslationManipulator', scene.assignDefaults(options, {
        name: name + '_ZAxis',
        color: FABRIC.RT.rgb(0, 0, 0.8),
        localXfo: new FABRIC.RT.Xfo({
          ori: FABRIC.RT.Quat.makeFromAxisAndAngle(FABRIC.RT.vec3(1, 0, 0), Math.degToRad(90))
        }),
        geometryNode: lineVector
      }, true));
    scene.pub.constructNode('LinearTranslationManipulator', scene.assignDefaults(options, {
        name: name + '_ZAxisArrowHead',
        color: FABRIC.RT.rgb(0, 0, 0.8),
        localXfo: FABRIC.RT.xfo({
          ori: FABRIC.RT.Quat.makeFromAxisAndAngle(FABRIC.RT.vec3(1, 0, 0), Math.degToRad(90)),
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
        name: name + '_YZPlane',
        color: FABRIC.RT.rgb(0.8, 0, 0, 1),
        localXfo: new FABRIC.RT.Xfo({
          ori: FABRIC.RT.Quat.makeFromAxisAndAngle(FABRIC.RT.vec3(0, 0, 1), Math.degToRad(90))
        }),
        geometryNode: drawTriangle
      }, true));
    scene.pub.constructNode('PlanarTranslationManipulator', scene.assignDefaults(options, {
        name: name + '_XZPlane',
        color: FABRIC.RT.rgb(0, 0.8, 0, 1),
        localXfo: new FABRIC.RT.Xfo(),
        geometryNode: drawTriangle
      }, true));
    scene.pub.constructNode('PlanarTranslationManipulator', scene.assignDefaults(options, {
        name: name + '_XYPlane',
        color: FABRIC.RT.rgb(0, 0, 0.8, 1),
        localXfo: new FABRIC.RT.Xfo({
          ori: FABRIC.RT.Quat.makeFromAxisAndAngle(FABRIC.RT.vec3(1, 0, 0), -Math.degToRad(90))
        }),
        geometryNode: drawTriangle
      }, true));

    return threeAxisTranslationManipulator;
  }});


FABRIC.SceneGraph.registerNodeType('PivotRotationManipulator', {
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
        rotateRate: 0.35,
        radius: 15,
        name: 'RotationManipulator'
      });

    if(!options.geometryNode){
      options.geometryNode = 
        scene.pub.constructNode('Circle', { radius: options.radius });
    }

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

      movement = vec2.subtract(vec1).unit().scale(Math.sin(Math.degToRad(angle * 0.5)) * options.radius * 2.0);
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
  }});




FABRIC.SceneGraph.registerNodeType('BoneManipulator', {
  factoryFn: function(options, scene) {
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

    var dragHandlerFn = function(evt, ray) {
      var dragVec,
        vec2,
        angle,
        movement,
        parentXfo,
        dragXfo,
        normal,
        dist,
        lengthRatio = 0,
        translationRatio = 0;
      ray2 = ray;
      if (evt.ctrlKey) {
        normal = localAxis;
      }
      else {
        normal = planeNormal;
      }
      hitPoint1 = ray1.intersectPlane(planePoint, normal).point;
      hitPoint2 = ray2.intersectPlane(planePoint, normal).point;
      
      dragVec = hitPoint2.subtract(hitPoint1);
      vec1 = normal.cross(vec1.cross(normal)).unit();
      vec2 = hitPoint2.subtract(planePoint);
      
      dragXfo = dragStartXFo.clone();
      
      if(parentManipulator && childManipulator){
        parentXfo = parentManipulator.counterRotateParent(dragVec);
        dragXfo.tr = parentXfo.tr;
      }else{
        parentXfo = manipulatorNode.getParentXfo();
        // The root of the chain can be translated.
      //  dragXfo.tr.addInPlace(dragVec);
      }

      var angle1 = -(vec1.negate().getAngleTo(dragXfo.tr.subtract(planePoint.add(vec1.scale(options.length)))));
      var angle2 = vec1.getAngleTo(vec2);
      
      if(childManipulator){
        angle = angle1;
      }else{
        angle = angle2;
      }
      if (evt.shiftKey) {
        angle = Math.round(angle / 5.0) * 5.0;
      }
      if (vec1.cross(vec2).dot(normal) < 0) {
        angle = -angle;
      }
      
      dragXfo.ori.postMultiplyInPlace(FABRIC.RT.Quat.makeFromAxisAndAngle(normal, angle));
      
      if(parentManipulator){
        manipulatorNode.setTargetOri(dragXfo.ori.postMultiply(parentXfo.ori.invert()));
      }else{
        manipulatorNode.setTargetGlobalXfo(dragXfo);
      }
      
      if (childManipulator) {
        movement = dragXfo.tr.add(dragXfo.ori.rotateVector(options.boneVector).scale(options.length)).subtract(
              dragStartXFo.tr.add(dragStartXFo.ori.rotateVector(options.boneVector).scale(options.length)));
        childManipulator.counterRotateChild(movement, dragXfo);
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
  }});



