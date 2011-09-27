
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
    createBoundingBoxNode: 'Flag instructing whether to construct a bounding box node. Bounding boxes are used in raycasting, so not always necessary'
  },
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
        createBoundingBoxNode: true,
        drawable: true
      });
  
    var geometryNode = geometryNode = scene.constructNode('SceneGraphNode', options),
      uniformsdgnode = geometryNode.constructDGNode('UniformsDGNode'),
      attributesdgnode = geometryNode.constructDGNode('AttributesDGNode'),
      bboxdgnode,
      redrawEventHandler,
      shaderUniforms = [],
      shaderAttributes = [];
      
    if(options.drawable){
      redrawEventHandler = geometryNode.constructEventHandlerNode('Redraw');
      redrawEventHandler.setScope('uniforms', uniformsdgnode);
      redrawEventHandler.setScope('attributes', attributesdgnode);
    }

    attributesdgnode.setDependency(uniformsdgnode, 'uniforms');
    
    if (options.createBoundingBoxNode) {
      bboxdgnode = geometryNode.constructDGNode('BoundingBoxDGNode');
      bboxdgnode.addMember('min', 'Vec3');
      bboxdgnode.addMember('max', 'Vec3');
      bboxdgnode.setDependency(attributesdgnode, 'attributes');
      bboxdgnode.bindings.append(scene.constructOperator({
        operatorName: 'calcBoundingBox',
        srcFile: 'FABRIC_ROOT/SceneGraph/KL/calcBoundingBox.kl',
        entryFunctionName: 'calcBoundingBox',
        parameterLayout: [
          'attributes.positions<>',
          'self.min',
          'self.max'
        ]
      }));
    }
    
    // Here we are ensuring that the generator ops are added to the
    // beginning of the operator list. if there are operators for
    // generating tangents, or any other data, they should always go after
    // the generator ops.
    // Currently the generator ops are bound to the attributesdgnode,
    // but with node nesting, we should put them on the outer node.
    // this would mean 2 things. We could generate geometry in a
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
    geometryNode.getRayIntersectionOperator = function() {
      throw ('Geometry must define this');
    };
    
    var capitalizeFirstLetter = function(str) {
      return str[0].toUpperCase() + str.substr(1);
    };
    
    // extend public interface
    geometryNode.pub.addUniformValue = function(name, type, value, addGetterSetterInterface) {
      uniformsdgnode.addMember(name, type, value);
      if (addGetterSetterInterface) {
        geometryNode.addMemberInterface(uniformsdgnode, name, true);
      }
      if(name == 'indices'){
        var registeredTypes = scene.getContext().RegisteredTypesManager.getRegisteredTypes();
        var attributeID = FABRIC.SceneGraph.getShaderParamID(name);
        var indicesBuffer = new FABRIC.RT.OGLBuffer(name, attributeID, registeredTypes.Integer);
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
    };
    geometryNode.pub.addVertexAttributeValue = function(name, type, attributeoptions) {
      attributesdgnode.addMember(name, type, attributeoptions ? attributeoptions.defaultValue : undefined);
      if(attributeoptions){
        if(attributeoptions.genVBO && redrawEventHandler){
          var registeredTypes = scene.getContext().RegisteredTypesManager.getRegisteredTypes();
          var typeDesc = registeredTypes[type];
          var attributeID = FABRIC.SceneGraph.getShaderParamID(name);
          var bufferMemberName = name + 'Buffer';
          
          var buffer = new FABRIC.RT.OGLBuffer(name, attributeID, typeDesc);
          if(attributeoptions.dynamic){
            buffer.bufferUsage = FABRIC.SceneGraph.OpenGLConstants.GL_DYNAMIC_DRAW;
          }
          
          redrawEventHandler.addMember(bufferMemberName, 'OGLBuffer', buffer);
          redrawEventHandler.preDescendBindings.append(scene.constructOperator({
            operatorName: 'load' + capitalizeFirstLetter(type) +'VBO',
            srcFile: 'FABRIC_ROOT/SceneGraph/KL/loadVBO.kl',
            preProcessorDefinitions: {
              DATA_TYPE: type
            },
            entryFunctionName: 'genAndBindVBO',
            parameterLayout: [
              'shader.shaderProgram',
              'attributes.' + name + '<>',
              'self.' + bufferMemberName
            ]
          }));
        }
      }
    };
    // Trigger a reloading of the vbo. This is useull when modifiying geometry
    // attributes that are not dynamic, but change from time to time.
    geometryNode.pub.reloadVBO = function(name) {
      var buffer = redrawEventHandler.getData(name + 'Buffer');
      buffer.reload = true;
      redrawEventHandler.setData(name + 'Buffer', 0, buffer);
    };
    geometryNode.pub.setAttributeDynamic = function(name) {
      var buffer = redrawEventHandler.getData(name + 'Buffer');
      buffer.bufferUsage = FABRIC.SceneGraph.OpenGLConstants.GL_DYNAMIC_DRAW;
      redrawEventHandler.setData(name + 'Buffer', 0, buffer);
    };
    geometryNode.pub.setAttributeStatic = function(name) {
      var buffer = redrawEventHandler.getData(name + 'Buffer');
      buffer.bufferUsage = FABRIC.SceneGraph.OpenGLConstants.GL_STATIC_DRAW;
      redrawEventHandler.setData(name + 'Buffer', 0, buffer);
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
    geometryNode.pub.getBulkAttributeData = function( pointIds ) {
      return attributesdgnode.getSlicesBulkData( pointIds );
    };
    geometryNode.pub.setBulkAttributeData = function( attributeData ) {
      return attributesdgnode.setSlicesBulkData( attributeData );
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
      bboxdgnode.evaluate();
      return {
        min: bboxdgnode.getData('min'),
        max: bboxdgnode.getData('max')
      }
    };
    
    return geometryNode;
  }});


FABRIC.SceneGraph.registerNodeType('GeometryDataCopy', {
  briefDesc: 'The GeometryDataCopy node is created using an existing Geometry node, and is used to build deformation stacks.',
  detailedDesc: 'When a node is evaluated, all the operators are evaluated. By splitting geometry into multiple data copies,' +
                ' only operators on nodes that are dirty will be evaluated. This makes it easy to build chains of nodes which,'+
                ' provide the same behavior as the operator stacks you would find in a traditional DCC application like 3dsmax/Maya/Softimage.',
  parentNodeDesc: 'Geometry',
  optionsDesc: {
    baseGeometryNode: 'The original data copy to use as the bases of this geometries data. '
  },
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
        baseGeometryNode: undefined,
        createBoundingBoxNode: false
      });
    
    if(!options.baseGeometryNode){
      throw 'A baseGeometryNode must be specified'
    }
    if (!options.baseGeometryNode.isTypeOf('Geometry')) {
      throw ('Incorrect type assignment. Must assign a Geometry');
    }
    var baseGeometryNode = scene.getPrivateInterface(options.baseGeometryNode);
    options.createDrawOperator = false;
    var geometryDataCopyNode = scene.constructNode('Geometry', options);
    
    geometryDataCopyNode.getUniformsDGNode().setDependency(baseGeometryNode.getUniformsDGNode(), 'parentuniforms');
    geometryDataCopyNode.getUniformsDGNode().setDependency(baseGeometryNode.getAttributesDGNode(), 'parentattributes');
    geometryDataCopyNode.getAttributesDGNode().setDependency(baseGeometryNode.getUniformsDGNode(), 'parentuniforms');
    geometryDataCopyNode.getAttributesDGNode().setDependency(baseGeometryNode.getAttributesDGNode(), 'parentattributes');
    if(baseGeometryNode.getBoundingBoxDGNode){
      geometryDataCopyNode.getUniformsDGNode().setDependency(baseGeometryNode.getBoundingBoxDGNode(), 'parentboundingbox');
      geometryDataCopyNode.getAttributesDGNode().setDependency(baseGeometryNode.getBoundingBoxDGNode(), 'parentboundingbox');
    }

    // The data copy must always have the same count on the attributes node,
    // as the original geometry node.
    geometryDataCopyNode.getAttributesDGNode().bindings.append(
      scene.constructOperator({
        operatorName: 'matchCount',
        srcCode: '\n'+
        'operator matchCount(Size parentCount, io Size selfCount) {\n' +
        '  selfCount = parentCount;\n' +
        '}',
        entryFunctionName: 'matchCount',
        parameterLayout: [
          'parentattributes.count',
          'self.newCount'
        ]
      }));
    
    var redrawEventHandler = geometryDataCopyNode.getRedrawEventHandler();
    redrawEventHandler.appendChildEventHandler(baseGeometryNode.getRedrawEventHandler());

    geometryDataCopyNode.pub.getBaseGeometry = function(){
      return baseGeometryNode.pub;
    }
    return geometryDataCopyNode;
  }});

FABRIC.SceneGraph.registerNodeType('InstancedGeometry', {
  briefDesc: 'The InstancedGeometry node is created using an existing Geometry node, and is used to copy the geometry multiple times.',
  detailedDesc: 'When performing instance drawing, GLSL based instancing can cause compatibility issues. By copying the geometry,' +
                ' several times, and introducing a new instanceID vertex attribute, we can draw instances by utilizing more RAM but '+
                ' being compatible with most graphic cards.',
  parentNodeDesc: 'Geometry',
  optionsDesc: {
    baseGeometryNode: 'The original geometry to use as the bases of this geometry instance copy.',
    baseGeometryType: 'The type of the original geometry node.',
    nbInstances: 'The number of instances to use.',
    instancedAttributes: 'The names of the vertex attributes to instantiate.'
  },
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
        baseGeometryNode: undefined,
        baseGeometryType: 'Triangles',
        nbInstances: 1,
        instancedAttributes: ['positions'] 
      });
    
    if(!options.baseGeometryNode){
      throw 'A baseGeometryNode must be specified'
    }
    if (!options.baseGeometryNode.isTypeOf('Geometry')) {
      throw ('Incorrect type assignment. Must assign a Geometry');
    }
    if (!options.baseGeometryType) {
      throw ('You have to specify a baseGeometryType for this constructor!');
    }
    
    var baseGeometryNode = scene.getPrivateInterface(options.baseGeometryNode);
    var geometryInstancingNode = scene.constructNode(options.baseGeometryType, options);
    
    geometryInstancingNode.getUniformsDGNode().setDependency(baseGeometryNode.getUniformsDGNode(), 'parentuniforms');
    geometryInstancingNode.getUniformsDGNode().setDependency(baseGeometryNode.getAttributesDGNode(), 'parentattributes');
    geometryInstancingNode.getAttributesDGNode().setDependency(baseGeometryNode.getUniformsDGNode(), 'parentuniforms');
    geometryInstancingNode.getAttributesDGNode().setDependency(baseGeometryNode.getAttributesDGNode(), 'parentattributes');
    
    geometryInstancingNode.getUniformsDGNode().addMember('nbInstances','Size',options.nbInstances);

    // The instancing node must always have a multiple of the count on the attributes node of the original.
    geometryInstancingNode.getAttributesDGNode().bindings.append( scene.constructOperator({
      operatorName: 'instantiateCount',
      srcFile: 'FABRIC_ROOT/SceneGraph/KL/geometryInstancing.kl',
      entryFunctionName: 'instantiateCount',
      parameterLayout: [
        'parentattributes.count',
        'self.newCount',
        'uniforms.nbInstances'
      ],
      preProcessorDefinitions: {
        DATA_TYPE: 'Vec3'
      },
    }));
    
    // The instancing node must use a multiple of the indices
    geometryInstancingNode.getUniformsDGNode().bindings.append( scene.constructOperator({
      operatorName: 'instantiateIndices',
      srcFile: 'FABRIC_ROOT/SceneGraph/KL/geometryInstancing.kl',
      entryFunctionName: 'instantiateIndices',
      parameterLayout: [
        'parentuniforms.indices',
        'self.indices',
        'self.nbInstances',
        'parentattributes.count'
      ],
      preProcessorDefinitions: {
        DATA_TYPE: 'Vec3'
      },
    }));
 
    // setup the instanceIDs
    geometryInstancingNode.pub.addVertexAttributeValue('instanceIDs','Integer',{ genVBO:true });
    geometryInstancingNode.getAttributesDGNode().bindings.append( scene.constructOperator({
      operatorName: 'instantiateInstanceIDs',
      srcFile: 'FABRIC_ROOT/SceneGraph/KL/geometryInstancing.kl',
      entryFunctionName: 'instantiateInstanceIDs',
      parameterLayout: [
        'self.index',
        'parentattributes.count',
        'self.instanceIDs'
      ],
      preProcessorDefinitions: {
        DATA_TYPE: 'Vec3'
      },
    }));
    geometryInstancingNode.pub.setAttributeStatic('instanceIDs');

    // now instantiate all attributes
    geometryInstancingNode.pub.instantiateAttribute = function(attrName) {
      var members = baseGeometryNode.getAttributesDGNode().getMembers();
      if(members[attrName] == undefined)
        throw('Vertex Attribute \''+attrName+'\' is not defined on baseGeometryNode!')
      
      var existingMembers = geometryInstancingNode.getAttributesDGNode().getMembers();
      if(!existingMembers[attrName])
        geometryInstancingNode.getAttributesDGNode().addMember(attrName,members[attrName].type);
      geometryInstancingNode.getAttributesDGNode().bindings.append( scene.constructOperator({
        operatorName: 'instantiate'+attrName[0].toUpperCase() + attrName.substr(1),
        srcFile: 'FABRIC_ROOT/SceneGraph/KL/geometryInstancing.kl',
        entryFunctionName: 'instantiateAttribute',
        parameterLayout: [
          'self.index',
          'parentattributes.count',
          'parentattributes.'+attrName+'<>',
          'self.'+attrName
        ],
        preProcessorDefinitions: {
          DATA_TYPE: members[attrName].type,
          DATA_NAME: attrName
        },
      }));
    }
    for(var i=0;i<options.instancedAttributes.length;i++)
      geometryInstancingNode.pub.instantiateAttribute(options.instancedAttributes[i]);

    geometryInstancingNode.pub.getBaseGeometry = function(){
      return baseGeometryNode.pub;
    }
    
    return geometryInstancingNode;
  }});

FABRIC.SceneGraph.registerNodeType('Points', {
  briefDesc: 'The Points node defines a renderable points geometry type.',
  detailedDesc: 'The Points node defines a renderable points geometry type. The Points node applies a custom draw operator and rayIntersection operator.',
  parentNodeDesc: 'Geometry',
  optionsDesc: {
  },
  factoryFn: function(options, scene) {
    
    scene.assignDefaults(options, {
        assignDrawOperator: true
      });
    
    var pointsNode = scene.constructNode('Geometry', options);

    // implement the geometry relevant interfaces
    if(options.assignDrawOperator){
      pointsNode.getRedrawEventHandler().postDescendBindings.append( scene.constructOperator({
        operatorName: 'drawPoints',
        srcFile: 'FABRIC_ROOT/SceneGraph/KL/drawPoints.kl',
        entryFunctionName: 'drawPoints',
        parameterLayout: [
          'shader.shaderProgram',
          'instance.drawToggle'
        ]
      }));
    }

    pointsNode.getRayIntersectionOperator = function(transformNodeMember) {
      return scene.constructOperator({
          operatorName: 'rayIntersectPoints',
          srcFile: 'FABRIC_ROOT/SceneGraph/KL/rayIntersectPoints.kl',
          entryFunctionName: 'rayIntersectPoints',
          parameterLayout: [
            'raycastData.ray',
            'raycastData.threshold',
            'transform.' + transformNodeMember,
            'geometry_attributes.positions<>',
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
    
    scene.assignDefaults(options, {
        assignDrawOperator: true
      });
    
    var linesNode = scene.constructNode('Geometry', options);
    
    if(options.assignDrawOperator){
      linesNode.getRedrawEventHandler().postDescendBindings.append( scene.constructOperator({
        operatorName: 'drawLines',
        srcFile: 'FABRIC_ROOT/SceneGraph/KL/drawLines.kl',
        entryFunctionName: 'drawLines',
        parameterLayout: [
          'shader.shaderProgram',
          'self.indicesBuffer',
          'instance.drawToggle'
        ]
      }));
    }

    linesNode.getRayIntersectionOperator = function(transformNodeMember) {
      return scene.constructOperator({
          operatorName: 'rayIntersectLines',
          srcFile: 'FABRIC_ROOT/SceneGraph/KL/rayIntersectLines.kl',
          entryFunctionName: 'rayIntersectLines',
          parameterLayout: [
            'raycastData.ray',
            'raycastData.threshold',
            'transform.' + transformNodeMember,
            'geometry_attributes.positions<>',
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
    
    scene.assignDefaults(options, {
        assignDrawOperator: true
      });
    
    var linesNode = scene.constructNode('Geometry', options);

    if(options.assignDrawOperator){
      linesNode.getRedrawEventHandler().postDescendBindings.append( scene.constructOperator({
        operatorName: 'drawLineStrip',
        srcFile: 'FABRIC_ROOT/SceneGraph/KL/drawLines.kl',
        entryFunctionName: 'drawLineStrip',
        parameterLayout: [
          'shader.shaderProgram',
          'self.indicesBuffer',
          'instance.drawToggle'
        ]
      }));
    }
    
    linesNode.getRayIntersectionOperator = function(transformNodeMember) {
      return scene.constructOperator({
          operatorName: 'rayIntersectLineStrip',
          srcFile: 'FABRIC_ROOT/SceneGraph/KL/rayIntersectLines.kl',
          entryFunctionName: 'rayIntersectLineStrip',
          parameterLayout: [
            'raycastData.ray',
            'raycastData.threshold',
            'transform.' + transformNodeMember,
            'geometry_attributes.positions<>',
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
        tangentsFromUV: undefined,
        assignDrawOperator: true
      });

    var trianglesNode = scene.constructNode('Geometry', options);
    
    if(options.assignDrawOperator){
      trianglesNode.getRedrawEventHandler().postDescendBindings.append( scene.constructOperator({
        operatorName: 'drawTriangles',
        srcFile: 'FABRIC_ROOT/SceneGraph/KL/drawTriangles.kl',
        entryFunctionName: 'drawTriangles',
        parameterLayout: [
          'shader.shaderProgram',
          'self.indicesBuffer',
          'instance.drawToggle'
        ]
      }));
    }
    
    trianglesNode.getRayIntersectionOperator = function(transformNodeMember) {
      return scene.constructOperator({
          operatorName: 'rayIntersectTriangles',
          srcFile: 'FABRIC_ROOT/SceneGraph/KL/rayIntersectTriangles.kl',
          entryFunctionName: 'rayIntersectTriangles',
          parameterLayout: [
            'raycastData.ray',
            'transform.' + transformNodeMember,
            'geometry_attributes.positions<>',
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
            'self.positions<>',
            'self.normals<>',
            'self.uvs' + tangentUVIndex + '<>',
            'self.tangents<>'
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
    enableShadowCasting: 'Flag specify whether this Instance should support shadow casting.'
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
    
    redrawEventHandler.setScope('instance', dgnode);

    var bindToSceneGraph = function() {
      
      // check if we have a sliced transform!
      if(options.transformNodeIndex == undefined && transformNode.getDGNode().getCount() > 1) {
        options.transformNodeIndex = 0
      }
      
      var transformdgnode = transformNode.getDGNode();
      redrawEventHandler.setScope('transform', transformdgnode);
      var preProcessorDefinitions = {
              MODELMATRIX_ATTRIBUTE_ID: FABRIC.SceneGraph.getShaderParamID('modelMatrix'),
              MODELMATRIXINVERSE_ATTRIBUTE_ID: FABRIC.SceneGraph.getShaderParamID('modelMatrixInverse'),
              VIEWMATRIX_ATTRIBUTE_ID: FABRIC.SceneGraph.getShaderParamID('viewMatrix'),
              CAMERAMATRIX_ATTRIBUTE_ID: FABRIC.SceneGraph.getShaderParamID('cameraMatrix'),
              CAMERAPOS_ATTRIBUTE_ID: FABRIC.SceneGraph.getShaderParamID('cameraPos'),
              PROJECTIONMATRIX_ATTRIBUTE_ID: FABRIC.SceneGraph.getShaderParamID('projectionMatrix'),
              PROJECTIONMATRIXINV_ATTRIBUTE_ID: FABRIC.SceneGraph.getShaderParamID('projectionMatrixInv'),
              NORMALMATRIX_ATTRIBUTE_ID: FABRIC.SceneGraph.getShaderParamID('normalMatrix'),
              MODELVIEW_MATRIX_ATTRIBUTE_ID: FABRIC.SceneGraph.getShaderParamID('modelViewMatrix'),
              MODELVIEWPROJECTION_MATRIX_ATTRIBUTE_ID: FABRIC.SceneGraph.getShaderParamID('modelViewProjectionMatrix')
            };
      if(options.transformNodeIndex == undefined){
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
            'transform.' + transformNodeMember + '<>',
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
        geometryNode.getRayIntersectionOperator
      ) {
        
        // check if this is a sliced transform node
        if(transformNode.getDGNode().getCount() && transformNode.getRaycastEventHandler) {
          scene.getSceneRaycastEventHandler().appendChildEventHandler(transformNode.getRaycastEventHandler());
        } else {
          var raycastOperator = geometryNode.getRayIntersectionOperator(transformNodeMember);
          raycastEventHandler = instanceNode.constructEventHandlerNode('Raycast');
          raycastEventHandler.setScope('geometry_uniforms', geometryNode.getUniformsDGNode());
          raycastEventHandler.setScope('geometry_attributes', geometryNode.getAttributesDGNode());
          raycastEventHandler.setScope('boundingbox', geometryNode.getBoundingBoxDGNode());
          raycastEventHandler.setScope('transform', transformNode.getDGNode());
          raycastEventHandler.setScope('instance', dgnode);
          // The selector will return the node bound with the given binding name.
          raycastEventHandler.setSelector('instance', raycastOperator);
  
          // the sceneRaycastEventHandler propogates the event throughtout the scene.
          scene.getSceneRaycastEventHandler().appendChildEventHandler(raycastEventHandler);
        }
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
      node = scene.getPrivateInterface(node);
      node.getRedrawEventHandler().appendChildEventHandler(redrawEventHandler);
      materialNodes.push(node);
      return instanceNode.pub;
    };
    instanceNode.pub.removeMaterialNode = function(val) {
      var index = -1;
      if(typeof val == 'number'){
        index = val;
      }else{
        node = scene.getPrivateInterface(val);
        index = materialNodes.indexOf(node);
      }
      if (index === -1) {
        throw (':Material not assigned');
      }
      materialNodes[index].getRedrawEventHandler().removeChildEventHandler(redrawEventHandler);
      materialNodes.splice(index, 1);
      return instanceNode.pub;
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
  }
});

FABRIC.SceneGraph.registerNodeType('ObjLoadTriangles', {
  briefDesc: 'The ObjLoadTriangles node is a resource load node able to load OBJ files.',
  detailedDesc: 'The ObjLoadTriangles node is a resource load node able to load OBJ files. It utilizes a C++ based extension to load OBJ files in a very fast fashion.',
  parentNodeDesc: 'ResourceLoad',
  optionsDesc: {
    removeParsersOnLoad: 'If set to true, the parser operator will be removed after parsing.'
  },
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
      removeParsersOnLoad: false
    });

    options.uvSets = 1; //To refine... what if there is no UV set??

    var resourceLoadNode = scene.constructNode('ResourceLoad', options),
      resourceloaddgnode = resourceLoadNode.getDGLoadNode(),
      trianglesNode = scene.constructNode('Triangles', options),
      emptyBindingsFunction;

    trianglesNode.getAttributesDGNode().setDependency(resourceloaddgnode, 'resource');
    trianglesNode.getUniformsDGNode().setDependency(resourceloaddgnode, 'resource');
    trianglesNode.pub.addUniformValue('reload', 'Boolean', true);
    trianglesNode.pub.addUniformValue('handle', 'Data');

    trianglesNode.setGeneratorOps([
      scene.constructOperator({
        operatorName: 'parseObjAndSetVertexCount',
        srcFile: 'FABRIC_ROOT/SceneGraph/KL/loadObj.kl',
        entryFunctionName: 'parseObjAndSetVertexCount',
        parameterLayout: [
          'resource.resource',
          'uniforms.handle',
          'uniforms.reload',
          'self.newCount'
        ]
      }),
      scene.constructOperator({
        operatorName: 'setObjGeom',
        srcFile: 'FABRIC_ROOT/SceneGraph/KL/loadObj.kl',
        entryFunctionName: 'setObjGeom',
        parameterLayout: [
          'uniforms.handle',
          'uniforms.indices',
          'self.positions<>',
          'self.normals<>',
          'self.uvs0<>',
          'uniforms.reload'
        ]
      }),
      scene.constructOperator({
        operatorName: 'freeObjParsedData',
        srcFile: 'FABRIC_ROOT/SceneGraph/KL/loadObj.kl',
        entryFunctionName: 'freeObjParsedData',
        parameterLayout: [
          'uniforms.handle'
        ]
      })
    ]);
    /////////////////////////////////////////////////////////////////////

    trianglesNode.pub.getResourceLoadNode = function() {
      return resourceLoadNode;
    };

    emptyBindingsFunction = function() {
      trianglesNode.getAttributesDGNode().bindings.empty();
    };

    resourceLoadNode.pub.addOnLoadSuccessCallback(emptyBindingsFunction);
    resourceLoadNode.pub.addOnLoadFailureCallback(emptyBindingsFunction);

    return trianglesNode;
  }
});
