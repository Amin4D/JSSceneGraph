
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//
FABRIC.SceneGraph.registerParser('abc', function(scene, assetUrl, options) {
  
  var results = {};
  var assetName = assetUrl.split('/').pop().split('.')[0];
  
  options.url = assetUrl;
  results[options.baseName] = scene.constructNode('AlembicLoadNode', options);
  return results;
});

FABRIC.SceneGraph.registerNodeType('AlembicLoadNode', {
  briefDesc: 'The AlembicLoadNode node is a ResourceLoad node able to parse Alembic.IO files.',
  detailedDesc: 'The AlembicLoadNode node is a ResourceLoad node able to parse Alembic.IO files. It utilizes a C++ based extension and generated parsed nodes such as Triangles or Camera nodes.',
  parentNodeDesc: 'ResourceLoad',
  optionsDesc: {
  },
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
      removeParsersOnLoad: false,
      dependentNode: undefined,
      onLoadSuccessCallback: undefined
    });

    // remember the original onLoadSuccessCallback
    var prevOnLoadSuccessCallback = options.onLoadSuccessCallback;
    options.onLoadSuccessCallback = undefined;

    var resourceLoadNode = scene.constructNode('ResourceLoad', options),
      resourceloaddgnode = resourceLoadNode.getDGLoadNode();
      
    // make the dependent node, well, dependent
    if(options.dependentNode != undefined) {
      var priv = scene.getPrivateInterface(options.dependentNode);
      for(var dgnodeName in priv.getDGNodes()) {
        priv.getDGNodes()[dgnodeName].setDependency(resourceloaddgnode,options.url);
      }
    }

    resourceloaddgnode.addMember('handle', 'AlembicHandle');
    resourceloaddgnode.addMember('identifiers', 'String[]');
    resourceloaddgnode.addMember('sample', 'Integer', 0);
    
    resourceLoadNode.addMemberInterface(resourceloaddgnode, 'sample', true);
    resourceLoadNode.pub.getNumSamples = function() {
      return resourceloaddgnode.getData('handle',0).numSamples;
    };
    
    resourceloaddgnode.bindings.append(scene.constructOperator({
      operatorName: 'alembicLoad',
      parameterLayout: [
        'self.url', //For debugging only
        'self.resource',
        'self.handle'
      ],
      entryFunctionName: 'alembicLoad',
      srcFile: 'FABRIC_ROOT/SceneGraph/KL/loadAlembic.kl',
      async: false
    }));

    resourceloaddgnode.bindings.append(scene.constructOperator({
      operatorName: 'alembicGetIdentifiers',
      parameterLayout: [
        'self.handle',
        'self.identifiers'
      ],
      entryFunctionName: 'alembicGetIdentifiers',
      srcFile: 'FABRIC_ROOT/SceneGraph/KL/loadAlembic.kl',
      async: false
    }));

    // add the main addOnLoadSuccessCallBack
    var parsedNodes = {};
    resourceLoadNode.pub.getParsedNodes = function(){
      return parsedNodes;
    }
    
    resourceLoadNode.pub.getCorrespondingTransform = function(identifier)
    {
      var names = identifier.split('/');
      if(names.length <= 2)
        return undefined;
      var parentIdentifier = identifier.substring(0,identifier.lastIndexOf('/'));
      return parsedNodes[parentIdentifier];
    }
    
    resourceLoadNode.pub.addOnLoadSuccessCallback(function(pub) {

      // define the getIdentifiers call
      resourceLoadNode.pub.getIdentifiers = function() {
        resourceloaddgnode.evaluate();
        return resourceloaddgnode.getData('identifiers',0);
      }
      
      // define the new nodes based on the identifiers in the file
      var identifiers = resourceLoadNode.pub.getIdentifiers();
      
      // we are assuming that we are always receiving either
      // a fullname such as /transform/shape
      // or just a shape /shape
      var objects = {};
      var targets = [];
      for(var i=0;i<identifiers.length;i++) {
        var parts = identifiers[i].split('|');
        var identifier = parts[0];
        var names = identifier.split('/');
        var name = names[names.length-1];
        var type = parts[1];
        objects[identifier] = type;
        
        // check if we have a parent transform
        var parentIdentifier = undefined;
        if(names.length > 2)
          parentIdentifier = identifier.substring(0,identifier.lastIndexOf('/'));
        var parentType = objects[parentIdentifier];
        
        // check this type
        if(type == 'PolyMesh') {
          
          var trianglesNode = scene.constructNode('Triangles', { uvSets: 1, createBoundingBoxNode: true } );
          trianglesNode
          trianglesNode.pub.setAttributeDynamic('positions');
          trianglesNode.pub.setAttributeDynamic('normals');
          trianglesNode.pub.setAttributeDynamic('uvs0');
          parsedNodes[identifier] = trianglesNode.pub;

          // retrieve thd dgnodes
          var uniformsdgnode = trianglesNode.getUniformsDGNode();
          uniformsdgnode.addMember('identifier','String',identifier);
          uniformsdgnode.addMember('uvsLoaded','Boolean',false);
          uniformsdgnode.setDependency(resourceloaddgnode,'alembic');
          var attributesdgnode = trianglesNode.getAttributesDGNode();
          attributesdgnode.setDependency(resourceloaddgnode,'alembic');
          
          // setup the parse operators
          uniformsdgnode.bindings.append(scene.constructOperator({
            operatorName: 'alembicParsePolyMeshUniforms',
            parameterLayout: [
              'alembic.handle',
              'self.identifier',
              'self.indices'
            ],
            entryFunctionName: 'alembicParsePolyMeshUniforms',
            srcFile: 'FABRIC_ROOT/SceneGraph/KL/loadAlembic.kl'
          }));
          
          attributesdgnode.bindings.append(scene.constructOperator({
            operatorName: 'alembicParsePolyMeshCount',
            parameterLayout: [
              'alembic.handle',
              'uniforms.identifier',
              'self.newCount'
            ],
            entryFunctionName: 'alembicParsePolyMeshCount',
            srcFile: 'FABRIC_ROOT/SceneGraph/KL/loadAlembic.kl'
          }));
          
          attributesdgnode.bindings.append(scene.constructOperator({
            operatorName: 'alembicParsePolyMeshAttributes',
            parameterLayout: [
              'alembic.handle',
              'uniforms.identifier',
              'alembic.sample',
              'self.positions<>',
              'self.normals<>',
              'uniforms.uvsLoaded',
              'self.uvs0<>'
            ],
            entryFunctionName: 'alembicParsePolyMeshAttributes',
            srcFile: 'FABRIC_ROOT/SceneGraph/KL/loadAlembic.kl'
          }));
        }
        else if(type == 'Camera') {
          
          var transformNode = parsedNodes[parentIdentifier];
          /*
          var cameraNode = scene.constructNode('TargetCamera', {
            position: FABRIC.RT.vec3(10, 20, 20),
            target: FABRIC.RT.vec3(0, 0, 0)
          });
          */

          var cameraNode = scene.constructNode('Camera', { transformNode: transformNode } );
          parsedNodes[identifier] = cameraNode.pub;

          var dgnode = cameraNode.getDGNode();
          dgnode.setDependency(resourceloaddgnode,'alembic');
          dgnode.addMember('identifier','String',identifier);
          
          // setup the parse operators
          dgnode.bindings.insert(scene.constructOperator({
            operatorName: 'alembicParseCamera',
            parameterLayout: [
              'alembic.handle',
              'self.identifier',
              'alembic.sample',
              'self.nearDistance',
              'self.farDistance',
              'self.fovY'
            ],
            entryFunctionName: 'alembicParseCamera',
            srcFile: 'FABRIC_ROOT/SceneGraph/KL/loadAlembic.kl'
          }),0);
        }
        else if(type == 'Xform')
        {
          var transformNode = scene.constructNode('Transform', {hierarchical: false});
          parsedNodes[identifier] = transformNode.pub;
          
          // have the transform be driven by the parser
          var dgnode = transformNode.getDGNode();
          dgnode.addMember('identifier','String',identifier);
          dgnode.setDependency(resourceloaddgnode,'alembic');

          // create the parser operator
          dgnode.bindings.append(scene.constructOperator({
            operatorName: 'alembicParseXform',
            parameterLayout: [
              'alembic.handle',
              'self.identifier',
              'alembic.sample',
              'self.globalXfo'
            ],
            entryFunctionName: 'alembicParseXform',
            srcFile: 'FABRIC_ROOT/SceneGraph/KL/loadAlembic.kl'
          }));
        }
        else
        {
          console.log("ERROR: UNSUPPORT ALEMBIC OBJECT TYPE: "+type+", skipping "+identifier);
        }
      }
      
      // setup the timerange
      if(resourceLoadNode.pub.getNumSamples() > 1) {
        // create an animation controller for the sample
        var animationController = scene.constructNode('AnimationController');
        resourceLoadNode.pub.getAnimationController = function() {
          return animationController.pub;
        };
        var animationControllerDGNode = animationController.getDGNode();
        resourceloaddgnode.setDependency(animationControllerDGNode,'controller');
    
        resourceloaddgnode.bindings.insert(scene.constructOperator({
          operatorName: 'alembicSetSample',
          parameterLayout: [
            'controller.localTime',
            'self.sample'
          ],
          entryFunctionName: 'alembicSetSample',
          srcFile: 'FABRIC_ROOT/SceneGraph/KL/loadAlembic.kl',
          async: false
        }),0);
        animationController.pub.setTimeRange(FABRIC.RT.vec2(0, resourceLoadNode.pub.getNumSamples() / 30.0));
      }
    });
    
    // also add the original on load callback
    if (prevOnLoadSuccessCallback != undefined)
      resourceLoadNode.pub.addOnLoadSuccessCallback(prevOnLoadSuccessCallback)

    
    return resourceLoadNode;
  }
});
