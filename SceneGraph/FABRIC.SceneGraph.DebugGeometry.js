
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//


FABRIC.RT.DebugGeometry = function() {
  this.positions = [];
  this.vertexColors = [];
  this.pointsIndices = [];
  this.linesIndices = [];
};

FABRIC.RT.DebugGeometry.prototype = {
  
};


FABRIC.appendOnCreateContextCallback(function(context) {
  context.RegisteredTypesManager.registerType('DebugGeometry', {
    members: {
      positions: 'Vec3[]',
      vertexColors: 'Color[]',
      pointsIndices: 'Integer[]',
      linesIndices: 'Integer[]'
    },
    constructor: FABRIC.RT.DebugGeometry,
    kBindings: FABRIC.loadResourceURL('FABRIC_ROOT/SceneGraph/RT/DebugGeometry.kl')
  });
});


FABRIC.SceneGraph.registerNodeType('DebugGeometryDraw', {
  briefDesc: 'The DebugGeometryDraw node draws debug geometry types on screen..',
  detailedDesc: '',
  parentNodeDesc: 'SceneGraphNode',
  optionsDesc: {
  },
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
        dgnode: undefined,
        debugGemetryMemberName: undefined
      });
    
    if(!options.dgnode){
      throw 'A dgnode must be specified in the constructor';
    }
    if(!options.debugGemetryMemberName){
      throw 'A debugGemetryMemberName must be specified in the constructor';
    }
  
    var debugGeometryDraw = scene.constructNode('SceneGraphNode', options),
      redrawEventHandler = debugGeometryDraw.constructEventHandlerNode('Redraw');
      
      
    redrawEventHandler.addScope('debuggeometrynode', options.dgnode);
      
    var registeredTypes = scene.getContext().RegisteredTypesManager.getRegisteredTypes();
    
    //////////////////////////////////////
    // Buffers
    var positionsBuffer = new FABRIC.RT.OGLBuffer(
        'positions', 
        FABRIC.SceneGraph.getShaderParamID('positions'), 
        registeredTypes.Vec3
      );
    positionsBuffer.bufferUsage = FABRIC.SceneGraph.OpenGLConstants.GL_DYNAMIC_DRAW;
          
    redrawEventHandler.addMember('positionsBuffer', 'OGLBuffer', positionsBuffer);
    
    var vertexColorsBuffer = new FABRIC.RT.OGLBuffer(
        'vertexColors', 
        FABRIC.SceneGraph.getShaderParamID('vertexColors'), 
        registeredTypes.Color
      );
    vertexColorsBuffer.bufferUsage = FABRIC.SceneGraph.OpenGLConstants.GL_DYNAMIC_DRAW;
          
    redrawEventHandler.addMember('vertexColorsBuffer', 'OGLBuffer', vertexColorsBuffer);
    
    var indicesBuffer = new FABRIC.RT.OGLBuffer(
        'indices',
        FABRIC.SceneGraph.getShaderParamID('indices'),
        registeredTypes.Integer
      );
    indicesBuffer.bufferUsage = FABRIC.SceneGraph.OpenGLConstants.GL_DYNAMIC_DRAW;
    
    redrawEventHandler.addMember('pointsIndicesBuffer', 'OGLBuffer', indicesBuffer);
    redrawEventHandler.addMember('linesIndicesBuffer', 'OGLBuffer', indicesBuffer);
    redrawEventHandler.addMember('drawToggle', 'Boolean', true);
    redrawEventHandler.addMember('transform', 'Xfo');
    
    redrawEventHandler.preDescendBindings.append(scene.constructOperator({
        operatorName: 'loadModelProjectionMatrices',
        srcFile: 'FABRIC_ROOT/SceneGraph/KL/loadModelProjectionMatrices.kl',
        entryFunctionName: 'loadModelProjectionMatrices',
        preProcessorDefinitions: {
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
        },
        parameterLayout: [
          'shader.shaderProgram',
          'self.transform',
          'camera.cameraMat44',
          'camera.projectionMat44'
        ]
      }));
    
    // Draw Operator
    redrawEventHandler.preDescendBindings.append(scene.constructOperator({
      operatorName: 'debugGeometryDraw',
      srcFile: 'FABRIC_ROOT/SceneGraph/KL/debugGeometryDraw.kl',
      entryFunctionName: 'debugGeometryDraw',
      parameterLayout: [
        'shader.shaderProgram',
        'debuggeometrynode.' + options.debugGemetryMemberName + '<>',
        'self.positionsBuffer',
        'self.vertexColorsBuffer',
        'self.pointsIndicesBuffer',
        'self.linesIndicesBuffer',
        'self.drawToggle'
      ]
    }));
    
    var vertexColorsMaterial = scene.constructNode('VertexColorMaterial', { drawOverlayed: true });
    vertexColorsMaterial.getRedrawEventHandler().appendChildEventHandler(redrawEventHandler);
    
    return debugGeometryDraw;
  }});


