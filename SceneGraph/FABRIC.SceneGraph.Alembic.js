
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
    resourceloaddgnode.addMember('time', 'Scalar', 0);
    resourceloaddgnode.addMember('identifiers', 'String[]');
    
    resourceLoadNode.addMemberInterface(resourceloaddgnode, 'time', true);
    resourceLoadNode.pub.getTimeRange = function() {
      return resourceloaddgnode.getData('handle',0).timeRange;
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
        var numSamples = parseInt(parts[2]);
        objects[identifier] = type;
        
        // check if we have a parent transform
        var parentIdentifier = undefined;
        if(names.length > 2)
          parentIdentifier = identifier.substring(0,identifier.lastIndexOf('/'));
        var parentType = objects[parentIdentifier];
        
        // check this type
        if(type == 'PolyMesh') {
          
          var trianglesNode = scene.constructNode('Triangles', { uvSets: 1, createBoundingBoxNode: true } );
          parsedNodes[identifier] = trianglesNode.pub;

          // retrieve thd dgnodes
          var uniformsdgnode = trianglesNode.getUniformsDGNode();
          uniformsdgnode.addMember('identifier','String',identifier);
          uniformsdgnode.addMember('uvsLoaded','Boolean',false);
          uniformsdgnode.addMember('alembicTime','Scalar',0);
          trianglesNode.getTimeDrivenDGNode = function() {
            return this.getUniformsDGNode();
          }
          uniformsdgnode.setDependency(resourceloaddgnode,'alembic');
          var attributesdgnode = trianglesNode.getAttributesDGNode();
          attributesdgnode.setDependency(resourceloaddgnode,'alembic');

          // create a function to access the number of sample of this node
          trianglesNode.pub.getNumSamples = (function(value) { return function() { return value; }; })(numSamples);
          
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
              'uniforms.alembicTime',
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
          var cameraNode = scene.constructNode('Camera', { transformNode: transformNode } );
          parsedNodes[identifier] = cameraNode.pub;

          var dgnode = cameraNode.getDGNode();
          dgnode.addMember('identifier','String',identifier);
          dgnode.addMember('alembicTime','Scalar',0);
          cameraNode.getTimeDrivenDGNode = function() {
            return this.getDGNode();
          }
          dgnode.setDependency(resourceloaddgnode,'alembic');
          
          // create a function to access the number of sample of this node
          cameraNode.pub.getNumSamples = (function(value) { return function() { return value; }; })(numSamples);

          // setup the parse operators
          dgnode.bindings.insert(scene.constructOperator({
            operatorName: 'alembicParseCamera',
            parameterLayout: [
              'alembic.handle',
              'self.identifier',
              'self.alembicTime',
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
          dgnode.addMember('alembicTime','Scalar',0);
          transformNode.getTimeDrivenDGNode = function() {
            return this.getDGNode();
          };
          dgnode.setDependency(resourceloaddgnode,'alembic');

          // create a function to access the number of sample of this node
          transformNode.pub.getNumSamples = (function(value) { return function() { return value; }; })(numSamples);

          // create the parser operator
          dgnode.bindings.append(scene.constructOperator({
            operatorName: 'alembicParseXform',
            parameterLayout: [
              'alembic.handle',
              'self.identifier',
              'self.alembicTime',
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
      var timeRange = resourceLoadNode.pub.getTimeRange();
      if(timeRange.x < timeRange.y) {
        // create an animation controller for the sample
        var animationController = scene.constructNode('AnimationController');
        resourceLoadNode.pub.getAnimationController = function() {
          return animationController.pub;
        };

        var animationControllerDGNode = animationController.getDGNode();
        
        // loop over each parsed node
        for(var name in parsedNodes) {
          var node = scene.getPrivateInterface(parsedNodes[name]);
          if(node.pub.getNumSamples() <= 1)
            continue;
          var dgnode = node.getTimeDrivenDGNode();
          dgnode.setDependency(animationControllerDGNode,'controller');
          dgnode.bindings.insert(scene.constructOperator({
            operatorName: 'alembicSetTime',
            parameterLayout: [
              'self.alembicTime',
              'controller.localTime'
            ],
            entryFunctionName: 'alembicSetTime',
            srcFile: 'FABRIC_ROOT/SceneGraph/KL/loadAlembic.kl'
          }),0);
          
          // if the node is a triangles node
          if(node.pub.isTypeOf('Triangles')) {
            node.pub.setAttributeDynamic('positions');
            node.pub.setAttributeDynamic('normals');
            node.pub.setAttributeDynamic('uvs0');
          }
        }

        animationController.pub.setTimeRange(timeRange);
      }
    });
    
    // also add the original on load callback
    if (prevOnLoadSuccessCallback != undefined)
      resourceLoadNode.pub.addOnLoadSuccessCallback(prevOnLoadSuccessCallback)

    
    return resourceLoadNode;
  }
});
