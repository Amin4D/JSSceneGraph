
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//


// Note: the ids defined in this table are used in the KL/GLSL code.
/**
 * The basic module for lights, defining the types for now.
 */
FABRIC.SceneGraph.Lights = {
  types: {
    'PointLight': 0,
    'DirectionalLight': 1,
    'SpotLight': 2
  }
};

FABRIC.SceneGraph.registerNodeType('Light', {
  briefDesc: 'The Light node is an abstract base node used by the Light types in the SceneGraph.',
  detailedDesc: 'The Light node is an abstract base node used by the Light types in the SceneGraph.',
  parentNodeDesc: 'SceneGraphNode',
  optionsDesc: {
    color: 'The color of the light when rendered in OpenGL. Note: Not all shaders use the light color',
    transformNode: 'The Transform node used to control the position of the light in the scene',
    transformNodeMember: 'The Xfo member of the transfrom node used ',
    globalXfo: 'If a transfrom node is not specified, then a default one is constructed, and this is the initial value of the globalXfo on that Transform node.'
  },
  factoryFn: function (options, scene) {
    scene.assignDefaults(options, {
      color: FABRIC.RT.rgb(1.0, 1.0, 1.0),
      transformNode: 'Transform',
      transformNodeMember: 'globalXfo',
      globalXfo: FABRIC.RT.xfo()
    });

    if (options.lightType == undefined) {
      throw ': Lights must define a type';
    }

    var lightNode = scene.constructNode('SceneGraphNode', options),
      dgnode = lightNode.constructDGNode('DGNode'),
      transformNode,
      transformNodeMember,
      redrawEventHandler;
    
    dgnode.addMember('type', 'Integer', options.lightType);
    dgnode.addMember('lightMat44', 'Mat44');
    dgnode.addMember('cameraMat44', 'Mat44');
    dgnode.addMember('color', 'Color', options.color);

    lightNode.getRedrawEventHandler = function() {
      // This call will replace the 'getRedrawEventHandler' with an accessor.
      redrawEventHandler = lightNode.constructEventHandlerNode('Redraw');
      redrawEventHandler.addScope('light', dgnode);

      redrawEventHandler.preDescendBindings.append(scene.constructOperator({
        operatorName: 'loadLight',
        srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/loadLights.kl',
        preProcessorDefinitions: {
          LIGHTTYPE_ATTRIBUTE_ID: FABRIC.shaderAttributeTable['lightType'].id,
          LIGHTCOLOR_ATTRIBUTE_ID: FABRIC.shaderAttributeTable['lightColor'].id,
          LIGHTPOS_ATTRIBUTE_ID: FABRIC.shaderAttributeTable['lightPosition'].id,
          LIGHTDIR_ATTRIBUTE_ID: FABRIC.shaderAttributeTable['lightDir'].id,
          LIGHTCOSCUTOFF_ATTRIBUTE_ID: FABRIC.shaderAttributeTable['lightCosCutoff'].id,
          LIGHTVIEWMATRIX_ATTRIBUTE_ID: FABRIC.shaderAttributeTable['lightShadowMapMatrix'].id
        },
        entryFunctionName: 'loadLight',
        parameterLayout: [
        'shader.uniformValues',
        'light.type',
        'light.color',
        'camera.cameraMat44',
        'light.lightMat44'
      ]
      }));

      return redrawEventHandler;
    };

    // public interface
    // TODO: try to have base class with input transform (would share with cameraNode)
    lightNode.pub.getTransformNode = function() {
      return transformNode.pub;
    };
    lightNode.pub.setTransformNode = function(node, member) {
      if (member) {
        transformNodeMember = member;
      }
      else {
        transformNodeMember = 'globalXfo';
      }

      node = scene.getPrivateInterface(node);
      if (!(node.getDGNode() && node.getDGNode().getMembers()[transformNodeMember])) {
        var message = 'Error in Transform node assignement on :' + node.name +
          ' \n member not found :' + transformNodeMember + '\n\n';
        message += 'Members:' + JSON.stringify(node.getDGNode().getMembers());
        throw (message);
      }
      transformNode = node;
      dgnode.addDependency(transformNode.getDGNode(), 'transform');

      dgnode.bindings.append(scene.constructOperator({
        operatorName: 'loadLightXfo',
        srcCode: 'operator loadLightXfo(io Xfo xfo, io Mat44 lightMat44, io Mat44 cameraMat44){ lightMat44 = xfo; cameraMat44 = lightMat44.inverse(); }',
        entryFunctionName: 'loadLightXfo',
        parameterLayout: [
          'transform.' + transformNodeMember,
          'self.lightMat44',
          'self.cameraMat44',
        ]
      }));
    }

    lightNode.addMemberInterface(dgnode, 'color', true);
    lightNode.addMemberInterface(dgnode, 'cameraMat44');

    if (typeof options.transformNode == 'string') {
      lightNode.pub.setTransformNode(scene.constructNode(options.transformNode, {
          hierarchical: false,
          globalXfo:options.globalXfo
        }).pub);
    } else {
      lightNode.pub.setTransformNode(options.transformNode, options.transformNodeMember);
    }

    return lightNode;
  }});


FABRIC.SceneGraph.registerNodeType('PointLight', {
  briefDesc: 'The PointLight node represents a point light in the SceneGraph.',
  detailedDesc: 'The PointLight node represents a point light in the SceneGraph. A Point light casts light in all directions from a point in space.',
  parentNodeDesc: 'Light',
  optionsDesc: {
    position: 'The initial positions of the Light if a Transform node is not specified',
    display: 'Toggle whether this light should display an icon of itself in the screen.',
    displaySize: 'The size of the displayed icon'
  },
  factoryFn: function (options, scene) {

    scene.assignDefaults(options, {
      position: FABRIC.RT.vec3(420.0, 1000.0, 600.0),
      display: false,
      displaySize: 5
    });

    options.lightType = FABRIC.SceneGraph.Lights.types.PointLight;
    options.globalXfo = FABRIC.RT.xfo({ tr: options.position });
    var pointLightNode = scene.constructNode('Light', options);
    var dgnode = pointLightNode.getDGNode();

    if (options.display === true) {
      //Ideally we should merge all these line segments together... or have a meta-geometry generator in kl (able to create circles, lines, etc)?
      var materialNode = scene.pub.constructNode('FlatMaterial', {
          color: FABRIC.RT.color(0.2, 0.5, 0.8, 1.0)
      });
      var circleNode = scene.pub.constructNode('Circle', {
          radius: options.displaySize/2
      });
      scene.pub.constructNode('Instance', {
        transformNode: pointLightNode.pub.getTransformNode(),
        geometryNode: circleNode,
        materialNode: materialNode
      });

      scene.pub.constructNode('Instance', {
        transformNode: scene.pub.constructNode('Transform', {
          hierarchical: true,
          parentTransformNode: pointLightNode.pub.getTransformNode(),
          localXfo: FABRIC.RT.xfo({ ori: FABRIC.RT.Quat.makeFromAxisAndAngle(FABRIC.RT.Vec3.xAxis, 90) })
        }),
        geometryNode: circleNode,
        materialNode: materialNode
      });

      scene.pub.constructNode('Instance', {
        transformNode: scene.pub.constructNode('Transform', {
          hierarchical: true,
          parentTransformNode: pointLightNode.pub.getTransformNode(),
          localXfo: FABRIC.RT.xfo({ ori: FABRIC.RT.Quat.makeFromAxisAndAngle(FABRIC.RT.Vec3.zAxis, 90) })
        }),
        geometryNode: circleNode,
        materialNode: materialNode
      });
    }

    return pointLightNode;
  }});

FABRIC.SceneGraph.registerNodeType('DirectionalLight', {
  briefDesc: 'The DirectionalLight node represents a directional light in the SceneGraph.',
  detailedDesc: 'The DirectionalLight node represents a directional light in the SceneGraph.' +
                'A Directional Light casts light in only one direction and the position is not used in lighting calculations.',
  parentNodeDesc: 'Light',
  optionsDesc: {
    position: 'The initial position of the Light if a Transform node is not specified',
    direction: 'The initial direction of the Light if a Transform node is not specified',
    display: 'Toggle whether this light should display an icon of itself in the screen.',
    displaySize: 'The size of the displayed icon'
  },
  factoryFn: function (options, scene) {

    if (!options.transformNode) {
      scene.assignDefaults(options, {
        direction: FABRIC.RT.vec3(0.0, 0.737, 0.737),
        position: FABRIC.RT.vec3(100.0, 100.0, 100.0),
        displaySize: 5
      });
    }

    options.lightType = FABRIC.SceneGraph.Lights.types.DirectionalLight;
    options.globalXfo = FABRIC.RT.xfo();
    if (options.position) {
      //The position is not used for directionalLight's lighting, but might be used for displaying the light
      options.globalXfo.tr = new FABRIC.RT.Vec3(options.position);
    }
    if (options.direction) {
      xfo.ori = FABRIC.RT.Quat.makeFrom2Vectors(new FABRIC.RT.Vec3(0.0, 0.0, -1.0), new FABRIC.RT.Vec3(options.direction).unit(), true);
    }
    var directionalLightNode = scene.constructNode('Light', options);
    var dgnode = directionalLightNode.getDGNode();

    var redrawEventHandlerConfigured = false;
    var parentGetRedrawEventHandler = directionalLightNode.getRedrawEventHandler;
    directionalLightNode.getRedrawEventHandler = function() {
      var redrawEventHandler = parentGetRedrawEventHandler();

      redrawEventHandler.preDescendBindings.append(scene.constructOperator({
        operatorName: 'loadDirectionalLight',
        srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/loadLights.kl',
        preProcessorDefinitions: {
          LIGHTTYPE_ATTRIBUTE_ID: FABRIC.shaderAttributeTable['lightType'].id,
          LIGHTCOLOR_ATTRIBUTE_ID: FABRIC.shaderAttributeTable['lightColor'].id,
          LIGHTPOS_ATTRIBUTE_ID: FABRIC.shaderAttributeTable['lightPosition'].id,
          LIGHTDIR_ATTRIBUTE_ID: FABRIC.shaderAttributeTable['lightDir'].id,
          LIGHTCOSCUTOFF_ATTRIBUTE_ID: FABRIC.shaderAttributeTable['lightCosCutoff'].id,
          LIGHTVIEWMATRIX_ATTRIBUTE_ID: FABRIC.shaderAttributeTable['lightShadowMapMatrix'].id
        },
        entryFunctionName: 'loadDirectionalLight',
        parameterLayout: [
          'shader.uniformValues',
          'camera.cameraMat44',
          'light.lightMat44'
        ]
      }));

      redrawEventHandlerConfigured = true;
      return redrawEventHandler;
    };


    if (options.display === true) {
      //Ideally we should merge all these line segments together... or have a meta-geometry generator in kl (able to create circles, lines, etc)?
      var materialNode = scene.pub.constructNode('FlatMaterial', {
          color: FABRIC.RT.color(0.2, 0.5, 0.8, 1.0)
      });
      var circleNode = scene.pub.constructNode('Circle', {
          radius: options.displaySize/2
      });
      scene.pub.constructNode('Instance', {
        transformNode: scene.pub.constructNode('Transform', {
          hierarchical: true,
          parentTransformNode: directionalLightNode.pub.getTransformNode(),
          localXfo: FABRIC.RT.xfo({ ori: FABRIC.RT.Quat.makeFromAxisAndAngle(FABRIC.RT.Vec3.xAxis, 90) })
        }),
        geometryNode: circleNode,
        materialNode: materialNode
      });

      scene.pub.constructNode('Instance', {
        transformNode: scene.pub.constructNode('Transform', {
          hierarchical: true,
          parentTransformNode: directionalLightNode.pub.getTransformNode(),
          localXfo: FABRIC.RT.xfo({ ori: FABRIC.RT.Quat.makeFromAxisAndAngle(FABRIC.RT.Vec3.xAxis, 90), tr: FABRIC.RT.vec3(0, 0, -options.displaySize) })
        }),
        geometryNode: circleNode,
        materialNode: materialNode
      });

      scene.pub.constructNode('Instance', {
        transformNode: scene.pub.constructNode('Transform', {
          hierarchical: true,
          parentTransformNode: directionalLightNode.pub.getTransformNode(),
          localXfo: FABRIC.RT.xfo({ ori: FABRIC.RT.Quat.makeFromAxisAndAngle(FABRIC.RT.Vec3.xAxis, 90), tr: FABRIC.RT.vec3(0, 0, -options.displaySize*0.8) })
        }),
        geometryNode: circleNode,
        materialNode: materialNode
      });
    }

    return directionalLightNode;
  }});


FABRIC.SceneGraph.registerNodeType('SpotLight', {
  briefDesc: 'The SpotLight node represents a spot light in the SceneGraph.',
  detailedDesc: 'The SpotLight node represents a spot light in the SceneGraph. ' +
                'A Spot Light casts light in a cone orriginating from a specified position and with an angle specified by the cone angle. ' +
                'The spot light can also be used to cast shadows using shadowmaps which are rendered prior to the scene being rendered'
  parentNodeDesc: 'Light',
  optionsDesc: {
    coneAngle: 'The angle of the cone in radians used in lighting calculations',
    castShadows: 'Toggle determining whether this light will be configured to render shadow maps in the pre render stage.',
    nearDistance: 'The near distance used to define the frustrum when rendering shadow maps',
    farDistance: 'The far distance used to define the frustrum when rendering shadow maps',
    resolution: 'The resolution of the shadow map.',
    displayShadowDebug: 'If set to true, renders a rectangle in the top left of the screen displaying the shadow map',
    position: 'The initial position of the Light if a Transform node is not specified',
    target: 'The initial target of the Light if a Transform node is not specified',
    display: 'Toggle whether this light should display an icon of itself in the screen.',
    displaySize: 'The size of the displayed icon'
  },
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
        coneAngle: 60 * FABRIC.RT.degToRad,
        castShadows: true,
        nearDistance: 1,
        farDistance: 1000,
        resolution: 1024,
        displayShadowDebug: false,
        display: false,
        displaySize: 50
      });

    if (!options.transformNode) {
      scene.assignDefaults(options, {
        position: FABRIC.RT.vec3(100.0, 100.0, 100.0),
        target: FABRIC.RT.vec3(0.0, 0.0, 0.0)
      });
      options.globalXfo = FABRIC.RT.xfo({
        tr: FABRIC.RT.vec3(options.position),
        ori: FABRIC.RT.Quat.makeFrom2Vectors(new FABRIC.RT.Vec3(0.0, 0.0, -1.0), new FABRIC.RT.Vec3(options.target).subtract(options.position).unit(), true)
      });
    }

    options.lightType = FABRIC.SceneGraph.Lights.types.SpotLight;
    var spotLightNode = scene.constructNode('Light', options);
    var dgnode = spotLightNode.getDGNode();
    
    dgnode.addMember('coneAngle', 'Scalar', options.coneAngle);
    spotLightNode.addMemberInterface(dgnode, 'coneAngle', true);

    var redrawEventHandlerConfigured = false;
    var parentGetRedrawEventHandler = spotLightNode.getRedrawEventHandler;
    spotLightNode.getRedrawEventHandler = function() {
      var redrawEventHandler = parentGetRedrawEventHandler();

      redrawEventHandler.preDescendBindings.append(
        scene.constructOperator({
          operatorName: 'loadSpotLight',
          srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/loadLights.kl',
          preProcessorDefinitions: {
          LIGHTTYPE_ATTRIBUTE_ID: FABRIC.shaderAttributeTable['lightType'].id,
          LIGHTCOLOR_ATTRIBUTE_ID: FABRIC.shaderAttributeTable['lightColor'].id,
          LIGHTPOS_ATTRIBUTE_ID: FABRIC.shaderAttributeTable['lightPosition'].id,
          LIGHTDIR_ATTRIBUTE_ID: FABRIC.shaderAttributeTable['lightDir'].id,
          LIGHTCOSCUTOFF_ATTRIBUTE_ID: FABRIC.shaderAttributeTable['lightCosCutoff'].id,
          LIGHTVIEWMATRIX_ATTRIBUTE_ID: FABRIC.shaderAttributeTable['lightShadowMapMatrix'].id
          },
          entryFunctionName: 'loadSpotLight',
          parameterLayout: [
            'shader.uniformValues',
            'light.coneAngle',
            'camera.cameraMat44',
            'light.lightMat44'
          ]
        }));

      if (options.castShadows) {
        
        this.constructShadowRenderEventHandler();
      
        redrawEventHandler.addMember('shadowMap', 'Size', 0);
        /*
        if(options.displayShadowDebug === true){
          // Display the shadow color map on screen.
          redrawEventHandler.preDescendBindings.append(
            scene.constructOperator({
                operatorName:"debugShadowMapBuffer",
                srcFile:"FABRIC_ROOT/SceneGraph/Resources/KL/shadowMaps.kl",
                entryFunctionName:"debugShadowMapBuffer",
                parameterLayout:[
                  'light.colorTextureID'
                ]
              }));
        }
        */
        redrawEventHandler.preDescendBindings.append(
          scene.constructOperator({
              operatorName: 'loadLightMatrixUniform',
              srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/loadLights.kl',
              preProcessorDefinitions: {
                LIGHTTYPE_ATTRIBUTE_ID: FABRIC.shaderAttributeTable['lightType'].id,
                LIGHTCOLOR_ATTRIBUTE_ID: FABRIC.shaderAttributeTable['lightColor'].id,
                LIGHTPOS_ATTRIBUTE_ID: FABRIC.shaderAttributeTable['lightPosition'].id,
                LIGHTDIR_ATTRIBUTE_ID: FABRIC.shaderAttributeTable['lightDir'].id,
                LIGHTCOSCUTOFF_ATTRIBUTE_ID: FABRIC.shaderAttributeTable['lightCosCutoff'].id,
                LIGHTVIEWMATRIX_ATTRIBUTE_ID: FABRIC.shaderAttributeTable['lightShadowMapMatrix'].id
              },
              entryFunctionName: 'loadLightMatrixUniform',
              parameterLayout: [
                'shader.uniformValues',
                'light.shadowMat44',
                'camera.cameraMat44'
              ]
            }));

        redrawEventHandler.preDescendBindings.append(
          scene.constructOperator({
              operatorName: 'bindShadowMapBufferOp',
              srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/shadowMaps.kl',
              entryFunctionName: 'bindShadowMapBuffer',
              parameterLayout: [
                'self.shadowMap',
                'light.depthTextureID'
              ]
            }));

     }

      redrawEventHandlerConfigured = true;
      return redrawEventHandler;
    };
    
    spotLightNode.constructShadowRenderEventHandler = function() {

      var shadowRenderEventHandler = spotLightNode.constructEventHandlerNode('RenderDepthBuffer');

      // Projection Values
      dgnode.addMember('nearDistance', 'Scalar', options.nearDistance);
      dgnode.addMember('farDistance', 'Scalar', options.farDistance);
      dgnode.addMember('projectionMat44', 'Mat44');
      dgnode.addMember('shadowMat44', 'Mat44');

      dgnode.addMember('shadowmapsize', 'Integer', options.resolution);
      dgnode.addMember('shadowFBO', 'Size', 0);
      dgnode.addMember('prevFBO', 'Size', 0);
      dgnode.addMember('depthTextureID', 'Size', 0);
      dgnode.addMember('colorTextureID', 'Size', 0);

      dgnode.bindings.append(scene.constructOperator({
          operatorName: 'calcLightProjectionMatricies',
          srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/shadowMaps.kl',
          entryFunctionName: 'calcLightProjectionMatricies',
          parameterLayout: [
            'self.nearDistance',
            'self.farDistance',
            'self.coneAngle',
            'self.cameraMat44',
            'self.projectionMat44',
            'self.shadowMat44'
          ]
        }));

      shadowRenderEventHandler.addScope('light', dgnode);
      shadowRenderEventHandler.addScope('camera', dgnode);

      shadowRenderEventHandler.preDescendBindings.append(scene.constructOperator({
          operatorName: 'genAndBindShadowMapFBO',
          srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/shadowMaps.kl',
          entryFunctionName: 'genAndBindShadowMapFBO',
          parameterLayout: [
            'light.shadowFBO',
            'light.prevFBO',
            'light.depthTextureID',
            'light.colorTextureID',
            'light.shadowmapsize'
          ]
        }));

      shadowRenderEventHandler.postDescendBindings.append(scene.constructOperator({
          operatorName: 'unbindFBO',
          srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/shadowMaps.kl',
          entryFunctionName: 'unbindFBO',
          parameterLayout: [
            'light.prevFBO'
          ]
        }));
      
      
        if(options.displayShadowDebug === true){
          // Display the shadow color map on screen.
          var shadowDebugRenderEventHandler = spotLightNode.constructEventHandlerNode('renderDebugQuad');
          scene.getScenePostRedrawEventHandler().appendChildEventHandler(shadowDebugRenderEventHandler);
          shadowDebugRenderEventHandler.addScope('light', dgnode);
          shadowDebugRenderEventHandler.preDescendBindings.append(
            scene.constructOperator({
                operatorName:"debugShadowMapBuffer",
                srcFile:"FABRIC_ROOT/SceneGraph/Resources/KL/shadowMaps.kl",
                entryFunctionName:"debugShadowMapBuffer",
                parameterLayout:[
                  'light.colorTextureID'
                ]
              }));
        }

      scene.registerShadowCastingLightSourceHandler(shadowRenderEventHandler);
    }
    
    spotLightNode.constructDisplay = function() {
      // tan(theta) = o/a
      // tan(theta)/a = o
      var coneDist = options.displaySize;
      if(options.position && options.target){
        coneDist = options.position.dist(options.target);
      }
      var coneRadius = Math.tan(options.coneAngle * 0.5) * coneDist;
      var lightMaterial = scene.pub.constructNode('FlatMaterial', { color: FABRIC.RT.rgb(1.0, 0.7, 0.4) });
      var crossGeometry = scene.pub.constructNode('Cross', { size: coneDist * 0.05 });

      scene.pub.constructNode('Instance', {
        transformNode: spotLightNode.pub.getTransformNode(),
        geometryNode: crossGeometry,
        materialNode: lightMaterial
      });
      scene.pub.constructNode('Instance', {
        transformNode: scene.pub.constructNode('Transform', {
          hierarchical: true,
          parentTransformNode: spotLightNode.pub.getTransformNode(),
          localXfo: FABRIC.RT.xfo({ tr: FABRIC.RT.vec3(0, 0, -coneDist) })
        }),
        geometryNode: crossGeometry,
        materialNode: lightMaterial
      });
      scene.pub.constructNode('Instance', {
        transformNode: scene.pub.constructNode('Transform', {
          hierarchical: true,
          parentTransformNode: spotLightNode.pub.getTransformNode(),
          localXfo: FABRIC.RT.xfo({
            ori: FABRIC.RT.Quat.makeFromAxisAndAngle(FABRIC.RT.Vec3.xAxis, 90),
            tr: FABRIC.RT.vec3(0, 0, -coneDist)
          })
        }),
        geometryNode: scene.pub.constructNode('Circle', {
          radius: coneRadius
        }),
        materialNode: lightMaterial
      });
    }
    
    if (options.display === true) {
      spotLightNode.constructDisplay();
    }

    return spotLightNode;
  }});


