
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//

FABRIC.SceneGraph.registerNodeType('Geometry', {
  briefDesc: 'The Geometry node is a base abstract node for all geometry nodes.',
  detailedDesc: 'The Geometry node defines the basic structure of a geometry, such as the uniforms, attributes, '+
                'and bounding box dgnodes. It also configures services for raycasting, and uploading vertex ' +
                'attributes to the GPU for rendering.',
  parentNodeDesc: 'SceneGraphNode',
  optionsDesc: {
    dynamicMembers: 'An array of members that will be used to generate dynamci VBOs. Add vertex attributes that will change during scene evaluation',
    genOpenGLBuffers: 'An array of members that will be used to generate VBOs in the dependency graph. Add vertex attributes that are used in OpenCL programs',
    createBoundingBoxNode: 'Flag instructing whether to construct a bounding box node. Bounding boxes are used in raycasting, so not always necessary'
  },
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
        dynamicMembers: [],
        genOpenGLBuffers:[],
        createBoundingBoxNode: true
      });
  
    var geometryNode = geometryNode = scene.constructNode('SceneGraphNode', options),
      uniformsdgnode = geometryNode.constructDGNode('UniformsDGNode'),
      attributesdgnode = geometryNode.constructDGNode('AttributesDGNode'),
      bboxdgnode,
      redrawEventHandler,
      shaderUniforms = [],
      shaderAttributes = [];

    attributesdgnode.addDependency(uniformsdgnode, 'uniforms');
    
    if (options.createBoundingBoxNode) {
      bboxdgnode = geometryNode.constructDGNode('BoundingBoxDGNode');
      bboxdgnode.addMember('min', 'Vec3');
      bboxdgnode.addMember('max', 'Vec3');
      bboxdgnode.addDependency(attributesdgnode, 'attributes');
      bboxdgnode.bindings.append(scene.constructOperator({
        operatorName: 'calcBoundingBox',
        srcFile: 'FABRIC_ROOT/SceneGraph/KL/calcBoundingBox.kl',
        entryFunctionName: 'calcBoundingBox',
        parameterLayout: [
          'attributes.positions[]',
          'self.min',
          'self.max'
        ]
      }));
    }
    
    // extend public interface
    geometryNode.pub.addUniformValue = function(name, type, value, addGetterSetterInterface) {
      uniformsdgnode.addMember(name, type, value);
      if (addGetterSetterInterface) {
        geometryNode.addMemberInterface(uniformsdgnode, name, true);
      }
    };
    geometryNode.pub.addVertexAttributeValue = function(name, type, attributeoptions) {
      attributesdgnode.addMember(name, type, options ? options.defaultValue : undefined);
      if(attributeoptions){
        if (attributeoptions.dynamic === true) {
          options.dynamicMembers.push(name);
        }
        if(attributeoptions.genVBO){
          shaderAttributes.push(name);
        }
      }
    };
    geometryNode.pub.setAttributeDynamic = function(name) {
      dynamicMember = options.dynamicMembers.indexOf(name) != -1;
      if (!dynamicMember)
        options.dynamicMembers.push(name);
    };
    geometryNode.pub.getUniformValue = function(name) {
      return uniformsdgnode.getData(name);
    };
    geometryNode.pub.setUniformValue = function(name, value) {
      return uniformsdgnode.setData(name, 0, value);
    };
    geometryNode.pub.getVertexCount = function(count) {
      return attributesdgnode.getCount();
    };
    geometryNode.pub.setVertexCount = function(count) {
      attributesdgnode.setCount(count);
    };
    // This method is used by the parsers such as the collada parser to load
    // parsed data into a constructed geometry.
    geometryNode.pub.loadGeometryData = function(data, datatype, sliceindex) {
      var i,
        uniformMembers = uniformsdgnode.getMembers(),
        attributeMembers = attributesdgnode.getMembers(),
        uniformData = {},
        attributeData = {};
      for (i in uniformMembers) {
        if (data[i]) {
          uniformsdgnode.setData(i, 0, data[i]);
        }
      }
      for (i in attributeMembers) {
        if (data[i]) {
          attributeData[i] = data[i];
        }
      }
      if (attributeData.positions) {
        attributesdgnode.setCount(attributeData.positions.length);
      }
      attributesdgnode.setBulkData(attributeData);
    };
    geometryNode.pub.getBoundingBox = function(){
      if(!bboxdgnode){
        throw("Goemetry does not support a Bounding Box");
      }
      return {
        min: bboxdgnode.getData('min'),
        max: bboxdgnode.getData('max')
      }
    };

    // extend private interface
    // ---------
    // Here we are ensuring that the generator ops are added to the
    // beginning of the operator list. if there are operators for
    // generating tangents, or any other data, they should always go after
    // the generator ops.
    // Currently the generator ops are bound to the attributesdgnode,
    // but with node nesting, we should put them on the outer node.
    // this would mean 2 trhings. We could generate geometry in a
    // single operator, and we wouldn't need this code here....
    geometryNode.setGeneratorOps = function(opBindings) {
      var i;
      if (attributesdgnode.bindings.empty()) {
        for (i = 0; i < opBindings.length; i++) {
          attributesdgnode.bindings.append(opBindings[i]);
        }
      }
      else {
        for (i = 0; i < opBindings.length; i++) {
          attributesdgnode.bindings.insert(opBindings[i], i);
        }
      }
    };
    geometryNode.checkVBORequirements = function(vboRequirements) {
      var vertexMembers = attributesdgnode.getMembers(),
        attributeName,
        message;
      for (attributeName in vboRequirements) {
        if(shaderAttributes.indexOf(attributeName) == -1){
          message = 'Geometry: ' + this.pub.getName() + ' does not meet shader requirements.\n';
          message += 'Shader requires :' + JSON.stringify(vboRequirements) + '\n';
          message += 'But geometry does not support attribute:' + JSON.stringify(attributeName) + '\n';

          message += 'Geometry supports :\n';
          for (var i=0; i<shaderAttributes.length; i++) {
            message += '\t\t' + shaderAttributes[i] + ' : ' + vertexMembers[shaderAttributes[i]].type + '\n';
          }
          throw (message);
        }
      }
      return true;
    };
    geometryNode.getRedrawEventHandler = function(redrawEventHandlerOptions) {
      var vertexMembers = attributesdgnode.getMembers(),
        uniformMembers = uniformsdgnode.getMembers(),
        registeredTypes = scene.getContext().RegisteredTypesManager.getRegisteredTypes(),
        i;

      // This call will replace the 'getRedrawEventHandler' with an accessor.
      redrawEventHandler = geometryNode.constructEventHandlerNode('Redraw');
      redrawEventHandler.addScope('uniforms', uniformsdgnode);
      redrawEventHandler.addScope('attributes', attributesdgnode);
      var capitalizeFirstLetter = function(str) {
        return str[0].toUpperCase() + str.substr(1);
      };

      if (uniformsdgnode.getMembers().indices) {
        
        var indicesBuffer = new FABRIC.RT.OGLBuffer(memberName, attributeID, registeredTypes.Integer);
        redrawEventHandler.addMember('indicesBuffer', 'OGLBuffer', indicesBuffer);

        redrawEventHandler.preDescendBindings.append(scene.constructOperator({
          operatorName: 'genVBO',
          srcFile: 'FABRIC_ROOT/SceneGraph/KL/loadVBO.kl',
          preProcessorDefinitions: {
            DATA_TYPE: 'Integer'
          },
          entryFunctionName: 'genVBO',
          parameterLayout: [
            'uniforms.indices',
            'self.indicesBuffer'
          ]
        }));
      }

      for (var memberName in vertexMembers) {
        if(shaderAttributes.indexOf(memberName) == -1){
          continue;
        }
        
        var attributeID = FABRIC.SceneGraph.getShaderParamID(memberName);
        var memberType = vertexMembers[memberName].type;
        var typeDesc = registeredTypes[memberType];
        var bufferMemberName = memberName + 'Buffer';
        
        if(uniformMembers[bufferMemberName]){
          // If this buffer has already been generated in the Dependency Graph,
          // then here we just need to bind the exsisting bufferID.
          redrawEventHandler.preDescendBindings.append(scene.constructOperator({
            operatorName: 'bind'+memberType+'VBO',
            srcFile: 'FABRIC_ROOT/SceneGraph/KL/loadVBO.kl',
            preProcessorDefinitions: {
              DATA_TYPE: memberType
            },
            entryFunctionName: 'bindVBO',
            parameterLayout: [
              'shader.shaderProgram',
              'uniforms.' + bufferMemberName
            ]
          }));
          continue;
        }
        
        var buffer = new FABRIC.RT.OGLBuffer(memberName, attributeID, typeDesc);
        if(options.dynamicMembers.indexOf(memberName) != -1){
          buffer.bufferUsage = FABRIC.SceneGraph.OpenGLConstants.GL_DYNAMIC_DRAW;
        }
        
        redrawEventHandler.addMember(bufferMemberName, 'OGLBuffer', buffer);
        redrawEventHandler.preDescendBindings.append(scene.constructOperator({
          operatorName: 'load' + capitalizeFirstLetter(memberType) +'VBO',
          srcFile: 'FABRIC_ROOT/SceneGraph/KL/loadVBO.kl',
          preProcessorDefinitions: {
            DATA_TYPE: memberType
          },
          entryFunctionName: 'genAndBindVBO',
          parameterLayout: [
            'shader.shaderProgram',
            'attributes.' + memberName + '[]',
            'self.' + bufferMemberName
          ]
        }));
      }
      
      if( !redrawEventHandlerOptions || redrawEventHandlerOptions.createDrawOperator != false ){
        redrawEventHandler.postDescendBindings.append(geometryNode.getDrawOperator());
      }
      return redrawEventHandler;
    };
    geometryNode.pub.reloadVBO = function(memberName) {
      var buffer = redrawEventHandler.getData(memberName + 'Buffer');
      buffer.reload = true;
      redrawEventHandler.setData(memberName + 'Buffer', 0, buffer);
    };
    geometryNode.getDrawOperator = function() {
      throw ('Geometry must define this');
    };
    geometryNode.getRayintersectionOperator = function() {
      throw ('Geometry must define this');
    };
    
    /*
    // Generate a VBO from the dependency graph.
    // this is usefull when using OpenCL. openGL buffers
    // can be created and used in both the computation
    // and rendering. 
    geometryNode.genDGVBO = function(memberName){
      var vertexMembers = attributesdgnode.getMembers();
      var uniformMembers = uniformsdgnode.getMembers();
      if (!vertexMembers[memberName]) {
        throw(memberName + " is not an attribute.");
      }
      var memberType = vertexMembers[memberName].type;
      var bufferMemberName = memberName + 'Buffer';
      var countMemberName = memberName + 'Count';
        
      var reloadMemberName = memberName + 'Reload';
      var dynamicMemberName = memberName + 'Dynamic';
      
      geometryNode.pub.addUniformValue(bufferMemberName, 'Integer', 0);
      geometryNode.pub.addUniformValue(countMemberName, 'Size', 0);
      geometryNode.pub.addUniformValue(reloadMemberName, 'Boolean', false);
      geometryNode.pub.addUniformValue(dynamicMemberName, 'Boolean', false);

      attributesdgnode.bindings.append(scene.constructOperator({
            operatorName: 'gen' + memberName + 'OpenGLBuffer',
            mainThreadOnly: true,
            srcFile: 'FABRIC_ROOT/SceneGraph/KL/genAndLoadVBO.kl',
            preProcessorDefinitions: {
              DATA_TYPE: memberType,
              ATTRIBUTE_NAME: memberName,
              ATTRIBUTE_ID: -1
            },
            entryFunctionName: 'genDGVBOOp',
            parameterLayout: [
              'self.' + memberName + '[]',
              'uniforms.' + countMemberName,
              'uniforms.' + dynamicMemberName,
              'uniforms.' + reloadMemberName,
              'uniforms.' + bufferMemberName
            ]
          }));
      return bufferMemberName;
    }
    */
    
    return geometryNode;
  }});


FABRIC.SceneGraph.registerNodeType('GeometryDataCopy', {
  briefDesc: 'The GeometryDataCopy node is created using an existing Geometry node, and is used to build deformation stacks.',
  detailedDesc: 'When a node is evaluated, all the operators are evaluated. By splitting geometry into multiple data copies,' +
                ' only operators on nodes that are dirty will be evaluated. This makes it easy to build chains of nodes which,'+
                ' provide the same behavior as the operator stacks you would find in a traditional DCC application like 3dsmax/Maya/Softimage.',
  parentNodeDesc: 'Geometry',
  optionsDesc: {
    geometryNode: 'The original data copy to use as the bases of this geometries data. '
  },
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
        baseGeometryNode: undefined
      });
    
    if(!options.baseGeometryNode){
      throw 'A baseGeometryNode must be specified'
    }
    if (!options.baseGeometryNode.isTypeOf('Geometry')) {
      throw ('Incorrect type assignment. Must assign a Geometry');
    }
    var baseGeometryNode = scene.getPrivateInterface(options.baseGeometryNode);
    var geometryDataCopyNode = scene.constructNode('Geometry', options);
    
    geometryDataCopyNode.getUniformsDGNode().addDependency(baseGeometryNode.getUniformsDGNode(), 'parentuniforms');
    geometryDataCopyNode.getUniformsDGNode().addDependency(baseGeometryNode.getBoundingBoxDGNode(), 'parentboundingbox');
    geometryDataCopyNode.getAttributesDGNode().addDependency(baseGeometryNode.getAttributesDGNode(), 'parentattributes');
    geometryDataCopyNode.getAttributesDGNode().addDependency(baseGeometryNode.getBoundingBoxDGNode(), 'parentboundingbox');

    geometryDataCopyNode.getAttributesDGNode().bindings.append(
      scene.constructOperator({
        operatorName: 'matchCount',
        srcCode: 'operator matchCount(Size parentCount, io Size selfCount) {\n' +
            '  selfCount = parentCount;\n' +
            '}',
        entryFunctionName: 'matchCount',
        parameterLayout: [
          'parentattributes.count',
          'self.newCount'
        ]
      }));
    
    var geometryGetRedrawEventHandler = geometryDataCopyNode.getRedrawEventHandler;
    geometryDataCopyNode.getRedrawEventHandler = function() {
      // the render traversal passed through this node, loads the VBOs, and them continues
      // to the baseGeometry.
      var redrawEventHandler = geometryGetRedrawEventHandler( { createDrawOperator: false } );
      var baseGeometryNodeRedrawEventHandler = baseGeometryNode.getRedrawEventHandler();
      
      redrawEventHandler.appendChildEventHandler(baseGeometryNodeRedrawEventHandler);
      return redrawEventHandler;
    }
    return geometryDataCopyNode;
  }});


FABRIC.SceneGraph.registerNodeType('Points', {
  briefDesc: 'The Points node defines a renderable points geometry type.',
  detailedDesc: 'The Points node defines a renderable points geometry type. The Points node applies a custom draw operator and rayIntersection operator.',
  parentNodeDesc: 'Geometry',
  optionsDesc: {
  },
  factoryFn: function(options, scene) {

    var pointsNode = scene.constructNode('Geometry', options);

    // implement the geometry relevant interfaces
    pointsNode.getDrawOperator = function() {
      return scene.constructOperator({
          operatorName: 'drawPoints',
          srcFile: 'FABRIC_ROOT/SceneGraph/KL/drawPoints.kl',
          entryFunctionName: 'drawPoints',
          parameterLayout: [
            'shader.shaderProgram',
            'self.positionsBuffer',
            'instance.drawToggle'
          ]
        });
    };
    pointsNode.getRayintersectionOperator = function(transformNodeMember) {
      return scene.constructOperator({
          operatorName: 'rayIntersectPoints',
          srcFile: 'FABRIC_ROOT/SceneGraph/KL/rayIntersectPoints.kl',
          entryFunctionName: 'rayIntersectPoints',
          parameterLayout: [
            'raycastData.ray',
            'raycastData.threshold',
            'transform.' + transformNodeMember,
            'geometry_attributes.positions[]',
            'boundingbox.min',
            'boundingbox.max'
          ]
        });
    };
    
    pointsNode.pub.addVertexAttributeValue('positions', 'Vec3', { genVBO:true } );
    return pointsNode;
  }});



FABRIC.SceneGraph.registerNodeType('Lines', {
  briefDesc: 'The Lines node defines a renderable lines geometry type.',
  detailedDesc: 'The Lines node defines a renderable lines geometry type. The Lines node applies a custom draw operator and rayIntersection operator.',
  parentNodeDesc: 'Geometry',
  optionsDesc: {
  },
  factoryFn: function(options, scene) {

    var linesNode = scene.constructNode('Geometry', options);

    // implement the geometry relevant interfaces
    linesNode.getDrawOperator = function() {
      return scene.constructOperator({
          operatorName: 'drawLines',
          srcFile: 'FABRIC_ROOT/SceneGraph/KL/drawLines.kl',
          parameterLayout: [
            'shader.shaderProgram',
            'self.indicesBuffer',
            'instance.drawToggle'
          ],
          entryFunctionName: 'drawLines'
        });
    };
    linesNode.getRayintersectionOperator = function(transformNodeMember) {
      return scene.constructOperator({
          operatorName: 'rayIntersectLines',
          srcFile: 'FABRIC_ROOT/SceneGraph/KL/rayIntersectLines.kl',
          entryFunctionName: 'rayIntersectLines',
          parameterLayout: [
            'raycastData.ray',
            'raycastData.threshold',
            'transform.' + transformNodeMember,
            'geometry_attributes.positions[]',
            'geometry_uniforms.indices',
            'boundingbox.min',
            'boundingbox.max'
          ]
        });
    };

    linesNode.pub.addVertexAttributeValue('positions', 'Vec3', { genVBO:true } );
    linesNode.pub.addUniformValue('indices', 'Integer[]');
    return linesNode;
  }});


FABRIC.SceneGraph.registerNodeType('LineStrip', {
  briefDesc: 'The Lines node defines a renderable lines geometry type.',
  detailedDesc: 'The Lines node defines a renderable lines geometry type. The Lines node applies a custom draw operator and rayIntersection operator.',
  parentNodeDesc: 'Geometry',
  optionsDesc: {
  },
  factoryFn: function(options, scene) {

    var linesNode = scene.constructNode('Geometry', options);

    // implement the geometry relevant interfaces
    linesNode.getDrawOperator = function() {
      return scene.constructOperator({
          operatorName: 'drawLineStrip',
          srcFile: 'FABRIC_ROOT/SceneGraph/KL/drawLines.kl',
          parameterLayout: [
            'shader.shaderProgram',
            'self.indicesBuffer',
            'instance.drawToggle'
          ],
          entryFunctionName: 'drawLineStrip'
        });
    };
    linesNode.getRayintersectionOperator = function(transformNodeMember) {
      return scene.constructOperator({
          operatorName: 'rayIntersectLineStrip',
          srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/rayIntersectLines.kl',
          entryFunctionName: 'rayIntersectLineStrip',
          parameterLayout: [
            'raycastData.ray',
            'raycastData.threshold',
            'transform.' + transformNodeMember,
            'geometry_attributes.positions[]',
            'geometry_uniforms.indices',
            'boundingbox.min',
            'boundingbox.max'
          ]
        });
    };

    linesNode.pub.addVertexAttributeValue('positions', 'Vec3', { genVBO:true } );
    linesNode.pub.addUniformValue('indices', 'Integer[]');
    return linesNode;
  }});




FABRIC.SceneGraph.registerNodeType('Triangles', {
  briefDesc: 'The Triangles node defines a renderable triangles geometry type.',
  detailedDesc: 'The Triangles node defines a renderable triangles geometry type. The Lines node applies a custom draw operator and rayIntersection operator.',
  parentNodeDesc: 'Geometry',
  optionsDesc: {
  },
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
        uvSets: undefined,
        tangentsFromUV: undefined
      });

    var trianglesNode = scene.constructNode('Geometry', options);

    // implement the geometry relevant interfaces
    trianglesNode.getDrawOperator = function() {
      return scene.constructOperator({
          operatorName: 'drawTriangles',
          srcFile: 'FABRIC_ROOT/SceneGraph/KL/drawTriangles.kl',
          parameterLayout: [
            'shader.shaderProgram',
            'self.indicesBuffer',
            'instance.drawToggle'
          ],
          entryFunctionName: 'drawTriangles'
        });
    };
    trianglesNode.getRayintersectionOperator = function(transformNodeMember) {
      return scene.constructOperator({
          operatorName: 'rayIntersectTriangles',
          srcFile: 'FABRIC_ROOT/SceneGraph/KL/rayIntersectTriangles.kl',
          entryFunctionName: 'rayIntersectTriangles',
          parameterLayout: [
            'raycastData.ray',
            'transform.' + transformNodeMember,
            'geometry_attributes.positions[]',
            'geometry_uniforms.indices',
            'boundingbox.min',
            'boundingbox.max'
          ]
        });
    };
    trianglesNode.writeData = function(sceneSaver, constructionOptions, nodeData) {
      if (options.uvSets) constructionOptions.uvSets = options.uvSets;
      if (options.tangentsFromUV) constructionOptions.tangentsFromUV = options.tangentsFromUV;
      nodeData.data = this.getAttributesDGNode().getBinary();
    };
    trianglesNode.readData = function(sceneLoader, nodeData) {
      if (nodeData.data) {
        this.getAttributesDGNode().setBinary(nodeData.data);
      }
    };

    trianglesNode.pub.addUniformValue('indices', 'Integer[]');
    trianglesNode.pub.addVertexAttributeValue('positions', 'Vec3', { genVBO:true } );
    trianglesNode.pub.addVertexAttributeValue('normals', 'Vec3', { genVBO:true } );

    var nbUVs = 0;
    if (typeof options.uvSets === 'number') {
      var nbUVs = parseInt(options.uvSets);
      for (var i = 0; i < nbUVs; i++) {
        trianglesNode.pub.addVertexAttributeValue('uvs' + i, 'Vec2', { genVBO:true } );
      }
      if (typeof options.tangentsFromUV === 'number') {
        var tangentUVIndex = parseInt(options.tangentsFromUV);
        if (tangentUVIndex >= nbUVs)
          throw 'Invalid UV index for tangent space generation';

        trianglesNode.pub.addVertexAttributeValue('tangents', 'Vec4', { genVBO:true } );
        trianglesNode.getAttributesDGNode().bindings.append(scene.constructOperator({
          operatorName: 'computeTriangleTangents',
          srcFile: 'FABRIC_ROOT/SceneGraph/KL/generateTangents.kl',
          entryFunctionName: 'computeTriangleTangents',
          parameterLayout: [
            'uniforms.indices',
            'self.positions[]',
            'self.normals[]',
            'self.uvs' + tangentUVIndex + '[]',
            'self.tangents[]'
          ]
        }));
      }
    }
    return trianglesNode;
  }});


FABRIC.SceneGraph.registerNodeType('Instance', {
  briefDesc: 'The Instance node represents a rendered geometry on screen.',
  detailedDesc: 'The Instance node represents a rendered geometry on screen. The Instance node propagates render events from Materials to Geometries, and also provides facilities for raycasting.',
  parentNodeDesc: 'SceneGraphNode',
  optionsDesc: {
    transformNode: 'Optional. Specify a Transform node to transform the geometry during rendering',
    transformNodeMember: 'Default Value:\'globalXfo\'. Specify the XFo member or member array on the transform node to use as the model matrix in rendering',
    transformNodeIndex: 'Default Value:undefined. Specify the index of the XFo in the member array on the transform node to use as the model matrix in rendering',
    constructDefaultTransformNode: 'Flag specify whether to construct a default transform node if none is provided by the \'transformNode\' option above.',
    geometryNode: 'Optional. Specify a Geometry node to draw during rendering',
    enableRaycasting: 'Flag specify whether this Instance should support raycasting.',
    enableDrawing: 'Flag specify whether this Instance should support drawing.',
    enableShadowCasting: 'Flag specify whether this Instance should support shadow casting.',
  },
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
        transformNode: undefined,
        transformNodeMember: 'globalXfo',
        transformNodeIndex: undefined,
        constructDefaultTransformNode: true,
        geometryNode: undefined,
        enableRaycasting: false,
        enableDrawing: true,
        enableShadowCasting: false
      });
    // TODO: once the 'selector' system can be replaced with JavaScript event
    // generation from KL, then we can eliminate this dgnode. It currently serves
    // no other purpose. 
    var instanceNode = scene.constructNode('SceneGraphNode', options),
      dgnode = instanceNode.constructDGNode('DGNode'),
      redrawEventHandler = instanceNode.constructEventHandlerNode('Redraw'),
      transformNode,
      transformNodeMember = options.transformNodeMember,
      geometryNode,
      materialNodes = [];

    dgnode.addMember('drawToggle', 'Boolean', options.enableDrawing);
    instanceNode.addMemberInterface(dgnode, 'drawToggle', true);
    
    redrawEventHandler.addScope('instance', dgnode);

    var bindToSceneGraph = function() {
      redrawEventHandler.addScope('transform', transformNode.getDGNode());
      var preProcessorDefinitions = {
              MODELMATRIX_ATTRIBUTE_ID: FABRIC.SceneGraph.getShaderParamID('modelMatrix'),
              MODELMATRIXINVERSE_ATTRIBUTE_ID: FABRIC.SceneGraph.getShaderParamID('modelMatrixInverse'),
              VIEWMATRIX_ATTRIBUTE_ID: FABRIC.SceneGraph.getShaderParamID('viewMatrix'),
              CAMERAPOS_ATTRIBUTE_ID: FABRIC.SceneGraph.getShaderParamID('cameraPos'),
              PROJECTIONMATRIX_ATTRIBUTE_ID: FABRIC.SceneGraph.getShaderParamID('projectionMatrix'),
              PROJECTIONMATRIXINV_ATTRIBUTE_ID: FABRIC.SceneGraph.getShaderParamID('projectionMatrixInv'),
              NORMALMATRIX_ATTRIBUTE_ID: FABRIC.SceneGraph.getShaderParamID('normalMatrix'),
              MODELVIEW_MATRIX_ATTRIBUTE_ID: FABRIC.SceneGraph.getShaderParamID('modelViewMatrix'),
              MODELVIEWPROJECTION_MATRIX_ATTRIBUTE_ID: FABRIC.SceneGraph.getShaderParamID('modelViewProjectionMatrix')
            };
      if(!options.transformNodeIndex){
        redrawEventHandler.preDescendBindings.append(scene.constructOperator({
            operatorName: 'loadModelProjectionMatrices',
            srcFile: 'FABRIC_ROOT/SceneGraph/KL/loadModelProjectionMatrices.kl',
            entryFunctionName: 'loadModelProjectionMatrices',
            preProcessorDefinitions: preProcessorDefinitions,
            parameterLayout: [
              'shader.shaderProgram',
              'transform.' + transformNodeMember,
              'camera.cameraMat44',
              'camera.projectionMat44'
            ]
          }));
      }else{
        redrawEventHandler.addMember('transformNodeIndex', 'Size', options.transformNodeIndex);
        redrawEventHandler.preDescendBindings.append(scene.constructOperator({
            operatorName: 'loadIndexedModelProjectionMatrices',
            srcFile: 'FABRIC_ROOT/SceneGraph/KL/loadModelProjectionMatrices.kl',
            entryFunctionName: 'loadIndexedModelProjectionMatrices',
            preProcessorDefinitions: preProcessorDefinitions,
            parameterLayout: [
              'shader.shaderProgram',
              'transform.' + transformNodeMember + '[]',
              'self.transformNodeIndex',
              'camera.cameraMat44',
              'camera.projectionMat44'
            ]
          }));
      }
      ///////////////////////////////////////////////
      // Ray Cast Event Handling
      if (scene.getSceneRaycastEventHandler() &&
        options.enableRaycasting &&
        geometryNode.getRayintersectionOperator
      ) {
        var raycastOperator = geometryNode.getRayintersectionOperator(transformNodeMember);
        raycastEventHandler = instanceNode.constructEventHandlerNode('Raycast');
        raycastEventHandler.addScope('geometry_uniforms', geometryNode.getUniformsDGNode());
        raycastEventHandler.addScope('geometry_attributes', geometryNode.getAttributesDGNode());
        raycastEventHandler.addScope('boundingbox', geometryNode.getBoundingBoxDGNode());
        raycastEventHandler.addScope('transform', transformNode.getDGNode());
        raycastEventHandler.addScope('instance', dgnode);
        // The selector will return the node bound with the given binding name.
        raycastEventHandler.setSelector('instance', raycastOperator);

        // the sceneRaycastEventHandler propogates the event throughtout the scene.
        scene.getSceneRaycastEventHandler().appendChildEventHandler(raycastEventHandler);
      }
    }

    // extend private interface
    instanceNode.writeData = function(sceneSaver, constructionOptions, nodeData) {
      constructionOptions.enableRaycasting = options.enableRaycasting;

      nodeData.transformNode = transformNode.name;
      nodeData.transformNodeMember = transformNodeMember;

      nodeData.geometryNode = geometryNode.name;
      nodeData.materialNodes = [];
      for (var i = 0; i < materialNodes.length; i++) {
        nodeData.materialNodes.push(materialNodes[i].name);
      }
    };
    instanceNode.readData = function(sceneLoader, nodeData) {
      if (nodeData.transformNode) {
        var transformNode = sceneLoader.getNode(nodeData.transformNode);
        if (transformNode) {
          this.setTransformNode(transformNode, nodeData.transformNodeMember);
        }
      }
      if (nodeData.geometryNode) {
        var geometryNode = sceneLoader.getNode(nodeData.geometryNode);
        this.setGeometryNode(geometryNode);
      }
      for (i in nodeData.materialNodes) {
        if (nodeData.materialNodes.hasOwnProperty(i)) {
          this.setMaterialNode(sceneLoader.getNode(nodeData.materialNodes[i]));
        }
      }
    };

    // extend public interface
    instanceNode.pub.getGeometryNode = function() {
      return geometryNode;
    };
    instanceNode.pub.setGeometryNode = function(node) {
      if (!node.isTypeOf('Geometry')) {
        throw ('Incorrect type assignment. Must assign a Geometry');
      }
      node = scene.getPrivateInterface(node);
      for (var i = 0; i < materialNodes.length; i++) {
        node.checkVBORequirements(materialNodes[i].getVBORequirements());
      }
      geometryNode = node;
      
      redrawEventHandler.appendChildEventHandler(geometryNode.getRedrawEventHandler());
      if (transformNode) {
        bindToSceneGraph();
      }
      return instanceNode.pub;
    };
    instanceNode.pub.getTransformNode = function() {
      return transformNode.pub;
    };
    instanceNode.pub.setTransformNode = function(node, member) {
      if (member) {
        transformNodeMember = member;
      }
      node = scene.getPrivateInterface(node);
      if (!(node.getDGNode() && node.getDGNode().getMembers()[transformNodeMember])) {
        var message = 'Error in Transform node assignement on :' + node.name +
          ' \n member not found :' + transformNodeMember + '\n\n';
        message += 'Members:' + JSON.stringify(node.getDGNode().getMembers());
        throw (message);
      }
      transformNode = node;
      if (geometryNode) {
        bindToSceneGraph();
      }
      return instanceNode.pub;
    };
    instanceNode.pub.getTransformNodeMember = function() {
      return transformNodeMember;
    };
    instanceNode.pub.getMaterialNode = function(index) {
      return scene.getPublicInterface(materialNodes[index ? index : 0]);
    };
    instanceNode.pub.setMaterialNode = function(node) {
      if (!node.isTypeOf('Material')) {
        throw (':Incorrect type assignment. Must assign a Material');
      }
      if (!geometryNode) {
        throw (':Geometry node not assigned. Geometry must be assigned before setting materials.');
      }
      node = scene.getPrivateInterface(node);
      geometryNode.checkVBORequirements(node.getVBORequirements());
      node.getRedrawEventHandler().appendChildEventHandler(redrawEventHandler);
      materialNodes.push(node);
      return instanceNode.pub;
    };
    instanceNode.pub.removeMaterialNode = function(node) {
      node = scene.getPrivateInterface(node);
      var index = materialNodes.indexOf(node);
      if (index === -1) {
        throw (':Material not assigned');
      }
      materialNodes[index].getRedrawEventHandler().removeChildEventHandler(redrawEventHandler);
      materialNodes.splice(index, 1);
      return instanceNode.pub;
    };

    // custom getter and setter for castShadows
    instanceNode.pub.getIsShadowCasting = function() {
      return materialNodes.indexOf(scene.getShadowMapMaterial()) != -1;
    };
    instanceNode.pub.setIsShadowCasting = function(val) {
      if (val) {
        if (options.shadowMappingMaterial) {
          instanceNode.pub.setMaterialNode(scene.pub.constructNode(options.shadowMappingMaterial));
        }
        else {
          instanceNode.pub.setMaterialNode(scene.getShadowMapMaterial());
        }
      }
      else {
        instanceNode.pub.removeMaterialNode(scene.getShadowMapMaterial());
      }
    };

    // Mouse events are fired on Instance nodes.
    // These events are generated using raycasting.
    scene.addEventHandlingFunctions(instanceNode);

    if (options.transformNode) {
      instanceNode.pub.setTransformNode(options.transformNode, options.transformNodeMember);
    }
    else if (options.constructDefaultTransformNode) {
      instanceNode.pub.setTransformNode(scene.pub.constructNode('Transform', { hierarchical: false }));
    }
    if (options.geometryNode) {
      instanceNode.pub.setGeometryNode(options.geometryNode);
    }
    if (options.materialNode) {
      instanceNode.pub.setMaterialNode(options.materialNode);
    }
    if (options.enableShadowCasting) {
      instanceNode.pub.setIsShadowCasting(true);
    }
    return instanceNode;
  }});

  FABRIC.SceneGraph.registerNodeType('ObjLoadTriangles', {
    factoryFn: function(options, scene) {
      scene.assignDefaults(options, {
      });

      options.uvSets = 1; //To refine... what if there is no UV set??

      var resourceLoadNode = scene.constructNode('ResourceLoad', options),
        resourceloaddgnode = resourceLoadNode.getDGLoadNode(),
        trianglesNode = scene.constructNode('Triangles', options);

      resourceloaddgnode.addMember('handle', 'Data');

      resourceloaddgnode.bindings.append(scene.constructOperator({
        operatorName: 'loadObj',
        parameterLayout: [
          'self.url', //For debugging only
          'self.resource',
          'self.handle'
        ],
        entryFunctionName: 'loadObj',
        srcFile: 'FABRIC_ROOT/SceneGraph/KL/loadObj.kl'
      }));

      trianglesNode.getAttributesDGNode().addDependency(resourceloaddgnode, 'resource');
      trianglesNode.getUniformsDGNode().addDependency(resourceloaddgnode, 'resource');

      trianglesNode.setGeneratorOps([
        scene.constructOperator({
          operatorName: 'setObjVertexCount',
          srcFile: 'FABRIC_ROOT/SceneGraph/KL/loadObj.kl',
          entryFunctionName: 'setObjVertexCount',
          parameterLayout: [
            'resource.handle',
            'self.newCount'
          ]
        }),
        scene.constructOperator({
          operatorName: 'setObjGeom',
          srcFile: 'FABRIC_ROOT/SceneGraph/KL/loadObj.kl',
          entryFunctionName: 'setObjGeom',
          parameterLayout: [
            'resource.handle',
            'uniforms.indices',
            'self.positions[]',
            'self.normals[]',
            'self.uvs0[]'
          ]
        })
      ]);

      trianglesNode.pub.getResourceLoadNode = function() {
        return resourceLoadNode;
      };

      return trianglesNode;
    }
  });

