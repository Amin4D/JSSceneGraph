
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//

/**
 * The rendering scene graph is the core implementation of Fabric's
 * additional rendering pipeline and capabilities.
 */
FABRIC.SceneGraph.registerNodeType('OffscreenViewport', {
  briefDesc: 'The OffscreenViewport node offers framebuffer based drawing.',
  detailedDesc: 'Utilizing a custom event and eventhandler, the OffscreenViewport node offers a powerful OpenGL framebuffer, ' +
                'which custom shaders can draw to. You can use this for computing depth as well as UV channels, for example. '+
                'The OffscreenViewport node uses the same camera and window as the standard viewport.',
  parentNodeDesc: 'SceneGraphNode',
  optionsDesc: {
    mainViewportNode: 'The viewport this OffscreenViewport will use the window and and viewport dgnode from.',
    cameraNode: 'An optional camera to be used for this OffscreenViewport. If not specified, the camera of the mainViewportNode is used.',
    eventName: 'The name of the event to be created. The OffscreenViewport will listen to this event to be fired for a redraw.',
    textureDescription: 'An optional parameter to define the texture definition which is used to store the OffscreenViewport\'s image.'
  },
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
        mainViewportNode: undefined,
        cameraNode: undefined,
        eventName: undefined,
        textureDescription: undefined
      });

    // query the main viewport
    if (!options.mainViewportNode) {
      throw ('Must provide a mainViewportNode to this constructor');
    }
    var mainViewportNode = options.mainViewportNode;
    if(!mainViewportNode.isTypeOf('Viewport')) {
      throw ('mainViewport is not a Viewport!');
    }
    
    // query the camera
    var cameraNode;
    if(options.cameraNode)
      cameraNode = options.cameraNode;
    else
      cameraNode = mainViewportNode.getCameraNode();
    if(!cameraNode.isTypeOf('Camera')) {
      throw ('cameraNode is not a Camera!');
    }
    
    // query the eventName
    if(!options.eventName) {
      throw(' Must provide an eventName to this constructor!');
    }
    var eventName = options.eventName+'';
    
    // create the offscreennode
    var offscreenNode = scene.constructNode('SceneGraphNode', {name: eventName});
    var dgnode = offscreenNode.constructDGNode('DGNode');
    
    // create the event and handler
    var eventNode = offscreenNode.constructEventNode(eventName);
    var eventHandlerNode = offscreenNode.constructEventHandlerNode('Redraw');
    eventNode.appendEventHandler(eventHandlerNode);
    
    // create the render target
    var textureDescription = options.textureDescription;
    if(!textureDescription) {
      textureDescription = new FABRIC.RT.OGLRenderTargetTextureDesc (
        2,
        new FABRIC.RT.OGLTexture2D (
          FABRIC.SceneGraph.OpenGLConstants.GL_RGBA16,
          FABRIC.SceneGraph.OpenGLConstants.GL_RGBA,
          FABRIC.SceneGraph.OpenGLConstants.GL_FLOAT)
      );
    }
    dgnode.addMember('renderTarget', 'OGLRenderTarget', FABRIC.RT.oglRenderTarget(0,0,[textureDescription]));
    
    // extend the public interface
    offscreenNode.pub.getEventName = function() {
      return eventName;
    };
    offscreenNode.pub.getEventHandler = function() {
      return eventHandlerNode;
    };
    offscreenNode.pub.redraw = function() {
      return eventNode.fire();
    };
    offscreenNode.pub.setViewportNode = function(viewport) {
      var viewport = scene.getPrivateInterface(viewport);
      if(!viewport.pub.isTypeOf('Viewport')) {
        throw ('Provided viewport is not of type Viewport!');
      }
      eventHandlerNode.setScope('viewPort',viewport.getDGNode());
      eventHandlerNode.setScope('window',viewport.getFabricWindowObject().windowNode);
    }
    offscreenNode.pub.setCameraNode = function(camera) {
      var camera = scene.getPrivateInterface(camera);
      if(!camera.pub.isTypeOf('Camera')) {
        throw ('Provided camera is not of type Camera!');
      }
      eventHandlerNode.setScope('camera',camera.getDGNode());
    }
    offscreenNode.pub.constructMaterial = function(name) {
      var materialNode = scene.constructNode(name, {
        parentEventHandler: eventHandlerNode
      });
      offscreenNode.pub['get'+name] = function() {
        return materialNode.pub;
      }
      return materialNode.pub;
    }
    
    // setup the known scopes
    offscreenNode.pub.setViewportNode(mainViewportNode);
    offscreenNode.pub.setCameraNode(cameraNode);
    eventHandlerNode.setScope('data',dgnode);
    
    // setup the prebindings in order
    var preBindings = eventHandlerNode.preDescendBindings;
    preBindings.append(
      scene.constructOperator({
          operatorName: 'bindScreenRenderTarget',
          srcFile: 'FABRIC_ROOT/SceneGraph/KL/renderTarget.kl',
          entryFunctionName: 'bindScreenRenderTarget',
          parameterLayout: [
            'window.width',
            'window.height',
            'data.renderTarget'
          ]
        }));
    
    preBindings.append(scene.constructOperator({
      operatorName: 'UpdateCameraProjection',
      srcFile: 'FABRIC_ROOT/SceneGraph/KL/updateCameraProjection.kl',
      entryFunctionName: 'updateCameraProjection',
      parameterLayout: [
        'camera.projectionMat44',
        'window.width',
        'window.height',
        'camera.nearDistance',
        'camera.farDistance',
        'camera.fovY',
        'camera.orthographic',
        'camera.screenOffset'
      ]
    }));

    eventHandlerNode.postDescendBindings.insert(
      scene.constructOperator({
          operatorName: 'unbindRenderTarget',
          srcFile: 'FABRIC_ROOT/SceneGraph/KL/renderTarget.kl',
          entryFunctionName: 'unbindRenderTarget',
          parameterLayout: [
            'data.renderTarget'
          ]
        }), 0);
    

    return offscreenNode;
  }});

