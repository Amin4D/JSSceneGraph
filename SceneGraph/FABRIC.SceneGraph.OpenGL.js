
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//

/**
 * The scene graph opengl is the core implementation of Fabric's
 * communication protocol with opengl
 */
if(FABRIC.SceneGraph) {
  
  FABRIC.SceneGraph.registerNodeType('OpenGLQuery', {
    briefDesc: 'The OpenGLQuery node implements an OpenGL query container.',
    detailedDesc: 'The OpenGLQuery node offers to query the OpenGL version '+
                  'as well as OpenGL capabilities.',
    factoryFn: function(options, scene) {
  
      var queryNode = scene.constructNode('SceneGraphNode', options),
        dgnode = queryNode.constructDGNode('DGNode');
        
      dgnode.addMember('version', 'String', '');
      
      dgnode.bindings.append(scene.constructOperator({
        operatorName: 'getOpenGLVersion',
        srcCode: 'use FabricOGL; operator getOpenGLVersion(io String version){\n' +
        '  version = glGetVersion();\n' +
        '}',
        entryFunctionName: 'getOpenGLVersion',
        parameterLayout: [
          'self.version'
        ]
      }));
      
      var openGLVersion = undefined;
      queryNode.pub.getOpenGLVersion = function() {
        
        // if we already know it, skip it
        if( openGLVersion == undefined) {
          // force an eval
          try{
            dgnode.evaluate();
          }catch(e){
            console.log(dgnode.getErrors());
          }
          openGLVersion = dgnode.getData('version',0);
        }

        return openGLVersion;
      }
      
      return queryNode;
    }});

  
  
  
}