
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//

/**
 * The scene graph is the core implementation of Fabric's
 * node graph in javascript.
 */
FABRIC.SceneGraph = {
  nodeDescriptions: {},
  assetLoaders: {},
  registerNodeType: function(type, nodeDescription) {
    if (this.nodeDescriptions[type]) {
      throw ('Node Constructor already Registered:' + type);
    }else {
      if (!nodeDescription.factoryFn)
        throw ('Node Constructor "'+type+'" does not implement the factoryFn');
        // Commented out till we can finish the documentation.
  //    if (!nodeDescription.briefDesc || !nodeDescription.detailedDesc)
  //      console.log('WARNING: Node Constructor "'+type+'" does not provide a proper description.');
      if(!nodeDescription.briefDesc) nodeDescription.briefDesc = '';
      if(!nodeDescription.detailedDesc) nodeDescription.detailedDesc = '';
      if(!nodeDescription.optionsDesc) nodeDescription.optionsDesc = {};
      if(!nodeDescription.parentNodeDesc) nodeDescription.parentNodeDesc = '';
      this.nodeDescriptions[type] = nodeDescription;
    }
  },
  help: function(type) {
    var result = {};
    if (!type) {
      for (type in this.nodeDescriptions) {
        result[type] = {};
        result[type].brief = this.nodeDescriptions[type].briefDesc;
        result[type].detailed = this.nodeDescriptions[type].detailedDesc;
        result[type].parentDesc = this.nodeDescriptions[type].parentNodeDesc;
        result[type].optionsDesc = this.nodeDescriptions[type].optionsDesc;
      }
    } else {
      if (!this.nodeDescriptions[type])
        throw ('Node Constructor "'+type+'" is not registered!');
      result.brief = this.nodeDescriptions[type].briefDesc;
      result.detailed = this.nodeDescriptions[type].detailedDesc;
      if(this.nodeDescriptions[this.nodeDescriptions[type].parentNodeDesc]){
        result.parentDesc = this.help(this.nodeDescriptions[type].parentNodeDesc);
      }
      result.optionsDesc = this.nodeDescriptions[type].optionsDesc;
    }
    return result;
  },
  registerParser: function(ext, parserFn) {
    var makeFileHandle = function(filePath) {
      return filePath.split('/').pop().split('.')[0];
    }
    if (!this.assetLoaders[ext]) {
      this.assetLoaders[ext] = function(scene, assetFile, options) {
        if (!options) options = {};
        options.baseName = makeFileHandle(assetFile);
        return parserFn(scene, assetFile, options);
      }
    }
  },
  createScene: function(sceneOptions) {
    
    var context = FABRIC.createContext();
    
    var assignDefaults = function(options, defaults, force) {
      if (!options) options = {};
      for (i in defaults) {
        if (options[i] === undefined || force) options[i] = defaults[i];
      }
      return options;
    };
    
    sceneOptions = assignDefaults(sceneOptions, {
        constructGlobalsNode: true,
        preDraw: true,
        postDraw: true,
        constructAnimationInterface: true,
        fixedTimeStep: true,
        timeStep: 0.02, // 0.02 seconds per frame = 50 fps
        shadowMaterial:'ShadowMaterial'
      });
    
    // first let's create the basic scene object
    // we will have a private (complete) as well as
    // a public interface, which we will return from this
    // function
    var scene = {
      pub: {
      }
    };
    
    // [pzion 20110711] This is a bit of a hack: we populate the *global*
    // OpenGL constants structure if it doesn't alrady exist.
    if (!FABRIC.SceneGraph.OpenGLConstants)
      FABRIC.SceneGraph.OpenGLConstants = JSON.parse(context.EX.getLoadedExts().FabricOGL.jsConstants);

    // EAch Viewport creates a new fabricwindow which is the origin of
    // window redraw events.
    var viewports = [];

    ///////////////////////////////////////////////////////////////////
    // Maps
    var operatorStore = {};
    var sceneGraphNodes = {};
    var shaderNodeStore = {};

    ///////////////////////////////////////////////////////////////////
    // Profiling
    var Timer = function(name) {
      this.name = name;
      this.count = 0;
      this.time = 0.0;
      this.childTimers = {};
      this.start = function() {
        this.pushtime = (new Date).getTime();
      }
      this.stop = function() {
        this.count += 1;
        var bracket = (new Date).getTime() - this.pushtime;
        this.time += bracket;
        if (!profiles[this.name]) {
          profiles[this.name] = { time: bracket, count: 1 };
        }else {
          profiles[this.name].time += bracket;
          profiles[this.name].count += 1;
        }
      }
      this.start();
    }
    var timerTree, currTimer;
    currTimer = new Timer('createScene');
    timerTree = currTimer;
    var timerStack = [];
    var profiles = {};

    var pushTimer = function(name) {
      var timer = currTimer.childTimers[name];
      if (timer) {
        timer.start();
      }else {
        timer = new Timer(name);
        currTimer.childTimers[name] = timer;
      }
      currTimer = timer;
      timerStack.push(timer);
    }
    var popTimer = function(name) {
      var timer = timerStack.pop();
      timer.stop();
      if (timerStack.length > 0) {
        currTimer = timerStack[timerStack.length - 1];
      }else {
        currTimer = timerTree;
      }
    }

    /////////////////////////////////////////////////////////////////////
    // The private scene object is passed into the constructor and can augment
    // objects with extra functionality.

    // Use the following methods with *extreme* caution. please...
    scene.getContext = function() {
      return context;
    };
    scene.pub.getContextId = function() {
      return context.getContextID();
    };
    scene.bindViewportToWindow = function(element, viewPort, options) {
      var fabricwindow = context.createWindow(element, options);
      // [pzion 20110326] Add a context menu item for any windows
      // in the context that pops up a Fabric debugger for the context
      fabricwindow.addPopUpMenuItem(
        'display-core-debugger',
        'Fabric debugger...',
        function(arg) {
          scene.pub.displayDebugger();
        }
      );
      viewports.push(viewPort);
      return fabricwindow;
    };
    scene.getRegisteredTypesManager = function() {
      return context.RegisteredTypesManager;
    };

    ///////////////////////////////////////////////////////////////////
    //  Resource File Loading
    scene.writeResourceFile = function(filepath, fileContents) {
      throw ' FS has been depreciated ';
    };
    scene.readResourceFile = function(filepath) {
      throw ' FS has been depreciated ';
    };
    scene.assignDefaults = assignDefaults;
    
    scene.cloneObj = function(obj) {
      var newobj = {};
      for (i in obj) {
        if (typeof obj[i] == 'object') {
          newobj[i] = this.cloneObj(obj[i]);
        }
        else {
          newobj[i] = obj[i];
        }
      }
      return newobj;
    };
    scene.loadResourceURL = function(url, mimeType, callback) {
      return FABRIC.loadResourceURL(url, mimeType, callback);
    };
    //////////////////////////////////////////////////
    // Timers.
    scene.pushTimer = function(name) {
      pushTimer(name);
    };
    scene.popTimer = function(name) {
      popTimer(name);
    };
    //////////////////////////////////////////////////
    // Constructors for the CORE
    scene.constructEventNode = function(name) {
      return context.DependencyGraph.createEvent(name);
    };
    scene.constructEventHandlerNode = function(name) {
      return context.DependencyGraph.createEventHandler(name);
    };
    scene.constructDependencyGraphNode = function(name, isResourceLoad) {
      if (isResourceLoad) {
        return context.DependencyGraph.createResourceLoadNode(name);
      }
      else {
        return context.DependencyGraph.createNode(name);
      }
    };

    scene.constructNode = function(type, options) {
      if (!FABRIC.SceneGraph.nodeDescriptions[type]) {
        throw ('Node Constructor not Registered:' + type);
      }
      options = (options ? options : {});
      if(!options.type ){
        options.__defineGetter__('type', function() {
          return type;
        });
        options.__defineSetter__('type', function(val) {
          throw ('Type is readonly');
        });
      }
      var sceneGraphNode = FABRIC.SceneGraph.nodeDescriptions[type].factoryFn(options, scene);
      if (!sceneGraphNode) {
        throw (' Factory function method must return an object');
      }
      var parentTypeOfFn = sceneGraphNode.pub.isTypeOf;
      sceneGraphNode.pub.isTypeOf = function(classname) {
        if (classname == type) {
          return true;
        }else if (parentTypeOfFn !== undefined) {
          return parentTypeOfFn(classname);
        }else {
          return false;
        }
      }
      return sceneGraphNode;
    };
    scene.getPrivateInterface = function(publicNode) {
      if (publicNode.pub && publicNode.pub.getName) {
        return publicNode;
      }
      if (!publicNode.getName) {
        throw ('Given object is not a valid public interface.');
      }
      if (!sceneGraphNodes[publicNode.getName()]) {
        throw ('SceneGraphNode "' + publicNode.getName() + '" does not exist!');
      }
      return sceneGraphNodes[publicNode.getName()];
    };
    scene.getPublicInterface = function(privateNode) {
      if (!privateNode.pub) {
        throw ('Given object does not have a public interface.');
      }
      return privateNode.pub;
    };
    scene.constructShaderNode = function(shaderType, options) {
      if (shaderNodeStore[shaderType]) {
        return shaderNodeStore[shaderType];
      }
      var shader = this.constructNode('Shader', options);
      shaderNodeStore[shaderType] = shader;
      return shader;
    };
    scene.preProcessCode = function(baseCode, preProcessorDefinitions, includedCodeSections) {

      var pos = 0,
        preprocessortagstart,
        preporcessortag,
        includeStart,
        includeEnd,
        includedFile,
        includedCode,
        resultCode = baseCode;
      while (pos < resultCode.length) {
        preprocessortagstart = resultCode.indexOf('#', pos);
        if (preprocessortagstart == -1) {
          pos = resultCode.length;
          continue;
        }

        // TODO: reimpliment this and test thorougly
      //  var blockcomment = resultCode.indexOf('/*', pos);
      //  if(blockcomment > 0 && blockcomment < preprocessortagstart){
      //    blockcomment = resultCode.indexOf('*/', blockcomment);
      //    pos = blockcomment+1;
      //    continue;
      //  }
      //  var linecomment = resultCode.lastIndexOf('//', preprocessortagstart);
      //  if(linecomment > 0 && linecomment < preprocessortagstart ){
      //    var newline = resultCode.indexOf('\n', linecomment);
      //    if(newline == -1 || newline < preprocessortagstart){
      //      pos = newline+3;
      //      continue;
      //    }
      //  }
        preporcessortag = resultCode.substring(preprocessortagstart, resultCode.indexOf(' ', preprocessortagstart));
        switch (preporcessortag) {
          case '#include':
            //includeStartDouble = resultCode.indexOf('"', preprocessortagstart + 7);
            //includeEndDouble = resultCode.indexOf('"', includeStartDouble + 1);
            includeStartSingle= resultCode.indexOf("'", preprocessortagstart + 7);
            includeEndSingle = resultCode.indexOf("'", includeStartSingle + 1);
            includeStart = includeStartSingle
            includeEnd = includeEndSingle
            //if(includeStart > includeStartSingle){
            //  includeStart = includeStartSingle
            //  includeEnd = includeEndSingle
            //}
            includedFile = resultCode.substring(includeStart + 1, includeEnd);
            try {
              includedCode = scene.loadResourceURL(includedFile);
              includedCode = this.preProcessCode.call(
                this, includedCode, preProcessorDefinitions, includedCodeSections);
              resultCode = resultCode.substr(
                0, preprocessortagstart) + includedCode + resultCode.substr(includeEnd + 1);
              if (includedCodeSections) {
                includedCodeSections.push({ start: preprocessortagstart, length: includedCode.length });
              }
              pos = preprocessortagstart + includedCode.length;
            }
            catch (e) {
              throw ('Failed to include file:' + includedFile);
            }
            break;
          default:
            pos = resultCode.indexOf('\n', preprocessortagstart) + 1;
        }
      }
      if (preProcessorDefinitions) {
        for (var def in preProcessorDefinitions) {
          while (resultCode.indexOf(def) != -1) {
            resultCode = resultCode.replace(def, preProcessorDefinitions[def]);
          }
        }
      }
      return resultCode;
    };
    
    scene.constructOperator = function(operatorDef) {
      
      var constructBinding = function(operator) {
        var binding = context.DG.createBinding();
        binding.setOperator(operator);
        binding.setParameterLayout(operatorDef.parameterLayout ? operatorDef.parameterLayout : []);
        return binding;
      }
      
      var uid = operatorDef.operatorName;
      if (operatorStore[uid]) {
        // If this operator has already been constructed,
        // reuse the exiting one. returne a unique binding.
        return constructBinding(operatorStore[uid]);
      }
      
      var operator = context.DG.createOperator(uid);
      operatorStore[uid] = operator;
      
      ///////////////////////////////////////////////////
      // Construct the operator
      var includedCodeSections = [];
      var configureOperator = function(code) {
        var descDiags;
        
        if (operatorDef.mainThreadOnly){
          operator.setMainThreadOnly(true);
        }
  
        descDiags = function(fullCode, diags) {
          var fullCodeLines = fullCode.split('\n');
          var desc = 'Error compiling operator: ' + operatorDef.operatorName + '\n';
          if (operatorDef.srcFile) desc += 'File:' + operatorDef.srcFile + '\n';
          for (var i = 0; i < diags.length; ++i) {
            if (i == 16) {
              desc += '(' + (diags.length - i) + ' more diagnostic(s) omitted)\n';
              break;
            }
            desc += diags[i].line + ':' + diags[i].column + ': ' + diags[i].level + ': ' + diags[i].desc + '\n';
            var line = diags[i].line - 1;
            for (var j = line - 6; j <= line + 6; ++j) {
              if (j >= 0 && j < fullCodeLines.length) {
                if (j == line)
                  desc += '>>>\t';
                else
                  desc += '\t';
                desc += '' + fullCodeLines[j] + '\n';
              }
            }
          }
          return desc;
        };
  
        operator.setEntryFunctionName(operatorDef.entryFunctionName);
        try {
          operator.setSourceCode(code);
        }
        catch (e) {
          var message = 'Error compiling operator: ' + operatorDef.operatorName + '\n';
          if (operatorDef.srcFile) message += ' File:' + operatorDef.srcFile + '\n';
          else message += ' Code:' + operatorDef.srcCode + '\n';
          throw (message + e);
        }
        var diagnostics = operator.getDiagnostics();
        if (diagnostics.length > 0) {
          console.error(descDiags(operator.getSourceCode(), diagnostics));
        }
      }

      if (!operatorDef.srcCode) {
        if(operatorDef.async === false){
          var code = FABRIC.loadResourceURL(operatorDef.srcFile, 'text/plain');
          code = scene.preProcessCode(code, operatorDef.preProcessorDefinitions, includedCodeSections);
          configureOperator(code);
        }else{
          FABRIC.loadResourceURL(operatorDef.srcFile, 'text/plain', function(code){
            code = scene.preProcessCode(code, operatorDef.preProcessorDefinitions, includedCodeSections);
            configureOperator(code);
          });
        }
      }
      else{
        // Fake an asynchronous operator construction so that we don't block waiting
        // for the operator compilation.
        if(operatorDef.async === false){
          var code = scene.preProcessCode(operatorDef.srcCode, operatorDef.preProcessorDefinitions, includedCodeSections);
          configureOperator(code);
        }else{
          FABRIC.addAsyncTask(function(){
            var code = scene.preProcessCode(operatorDef.srcCode, operatorDef.preProcessorDefinitions, includedCodeSections);
            configureOperator(code);
          });
        }
      }
      return constructBinding(operator);
    };
    //////////////////////////////////////////////////////////
    // Accessors
    var globalsNode;
    scene.getGlobalsNode = function() {
      return globalsNode;
    };
    scene.getScenePreRedrawEventHandler = function() {
      return preDrawEventHandler;
    };
    scene.getSceneRedrawEventHandler = function() {
      return beginDrawEventHandler;
    };
    scene.getSceneRedrawOpaqueObjectsEventHandler = function() {
      return beginDrawOpaqueObjectsEventHandler;
    };
    scene.getSceneRedrawTransparentObjectsEventHandler = function() {
      return beginDrawTransparentObjectsEventHandler;
    };
    scene.getScenePostRedrawEventHandler = function() {
      return postDrawEventHandler;
    };
    scene.getSceneRaycastEventHandler = function() {
      return sceneRaycastEventHandler;
    };
    //////////////////////////////////////////////////////////
    // Shadow Mapping
    scene.registerShadowCastingLightSourceHandler = function(lightSourceRenderhandler) {
      propagateRenderShadowMapEvent.appendChildEventHandler(lightSourceRenderhandler);
      lightSourceRenderhandler.appendChildEventHandler(beginRenderShadowMap);
    };
    scene.getBeginRenderShadowMapEventHandler = function() {
      return beginRenderShadowMap;
    };
    scene.getShadowMapMaterial = function() {
      if (!shadowMapMaterial) {
        shadowMapMaterial = this.pub.constructNode(sceneOptions.shadowMaterial, {
          parentEventHandler: beginRenderShadowMap
        });
      }
      return shadowMapMaterial;
    };
    scene.addEventHandlingFunctions = function(obj) {
      // We store a map of arrays of event listener functions.
      var eventListeners = {};
      obj.pub.addEventListener = function(type, fn) {
        if (!eventListeners[type]) {
          eventListeners[type] = [];
        }
        eventListeners[type].push(fn);
      };
      obj.pub.removeEventListener = function(type, fn) {
        if (eventListeners[type]) {
          var id = eventListeners[type].indexOf(fn);
          if (id !== -1) {
            eventListeners[type].splice(id, 1);
          }
        }
      };
      obj.pub.fireEvent = function(type, evt) {
        for (i in eventListeners[type]) {
          if (eventListeners[type].hasOwnProperty(i)) {
            eventListeners[type][i].call(this, evt);
          }
        }
      }
      return obj;
    };

    /////////////////////////////////////////////////////////////////////
    // Public Scene Interface

    scene.pub.displayDebugger = function() {
      FABRIC.displayDebugger(context);
    };
    scene.pub.getSceneGraphNode = function(name) {
      return sceneGraphNodes[name];
    };
    scene.setSceneGraphNode = function(name,node) {
      return sceneGraphNodes[name] = node;
    };
    scene.pub.getRootTransformNode = function() {
      return rootNode;
    };
    scene.pub.constructNode = function(type, options) {
      return scene.constructNode(type, options).pub;
    };
    // TODO: Remove the following 2 functoins and test.
    scene.pub.readResourceFile = function(filepath) {
      return scene.readResourceFile(filepath);
    };
    scene.pub.writeResourceFile = function(filepath, fileContents) {
      scene.writeResourceFile(filepath, fileContents);
    };
    scene.pub.getGlobalsNode = function() {
      return globalsNode;
    };
    scene.pub.importAssetFile = function(file, options) {
      var ext = file.split('.').pop();
      if (FABRIC.SceneGraph.assetLoaders[ext]) {
        var assets = FABRIC.SceneGraph.assetLoaders[ext](scene.pub, file, options);
        return assets;
      }
      else {
        throw ('Missing Resource Loader for :' + ext);
      }
    };
    scene.pub.redrawAllWindows = function() {
      for (var i=0; i<viewports.length; i++) {
        viewports[i].pub.redraw();
      }
    };
    scene.pub.getErrors = function() {
      var errors = [];
      var allNamedObjects = context.DG.getAllNamedObjects();
      for (i in allNamedObjects) {
        if (allNamedObjects.hasOwnProperty(i)) {
          var dgErrors = allNamedObjects[i].getErrors();
          if(!dgErrors){
            console.warn( i + " does not return an errors array");
            continue;
          }
          if (dgErrors.length > 0) {
            errors.push(i + ':' + JSON.stringify(dgErrors));
          }
        }
      }
      return errors;
    };
    scene.pub.getTimerProfiles = function() {
      if (timerStack.length > 0) {
        throw 'Timer Stack not balanced';
      }
      timerTree.stop();
      var timerProfiles = 'Scene Construction Profiles \n';
      timerProfiles += 'SceneConstructTime:' + timerTree.time / 1000 + ' seconds\n';

      var logTimer = function(timer, parentTimer, indent) {
        var str = indent + (
          timer.name + ' count:' + timer.count + ' time:' + timer.time / 1000 +
          ' percentage:' + ((timer.time / parentTimer.time) * 100).toFixed(2) + '%\n');
        for (i in timer.childTimers) {
          str += logTimer(timer.childTimers[i], timer, indent + '\t');
        }
        return str;
      }
      var str = logTimer(timerTree, timerTree, '');
      str += '----------------------------------\n';
      for (i in profiles) {
        str += (i + ' count:' + profiles[i].count + ' time:' + profiles[i].time / 1000 +
          ' costpercall:' + ((profiles[i].time / profiles[i].count) / 1000).toFixed(4) +
          ' percentage:' + ((profiles[i].time / timerTree.time) * 100).toFixed(2) + '%\n');
      }
      return str;
    };

    scene.addEventHandlingFunctions(scene);

    ///////////////////////////////////////////////////////////////////
    // Create the root transform node.
    // All transformation nodes must have a parent...
    var rootNode = scene.pub.constructNode('Transform', { name: 'RootTransfrom', hierarchical: false });

    // and the shaders will be left connected to this node. Multiple
    // cameras can render the scene by connecting to this node.
    var preDrawEventHandler, postDrawEventHandler;
    var propagateRenderShadowMapEvent, beginRenderShadowMap, shadowMapMaterial;
    if(sceneOptions.preDraw){
      preDrawEventHandler = scene.constructEventHandlerNode('Scene_PreDraw');
      propagateRenderShadowMapEvent = scene.constructEventHandlerNode('PropagateRenderShadowMapEvent');
      
      ///////////////////////////////////////////////////////////////////
      // Shadowcasting Lightsource <-> SceneGraph draw event handler firewall
      beginRenderShadowMap = scene.constructEventHandlerNode('BeginRenderShadowMap');
      
        
      // The 'Parent' node is the first child of the scene redraw event.
      // This means that the event traversial will propagate down the
      // shadow casting graph, before propagating down the render graph.
      preDrawEventHandler.appendChildEventHandler(propagateRenderShadowMapEvent);
    }
    if(sceneOptions.postDraw){
      postDrawEventHandler = scene.constructEventHandlerNode('Scene_PostDraw');
    }

    ///////////////////////////////////////////////////////////////////
    // All scene draw event handlers(shaders) are attached to this handler.
    var beginDrawEventHandler = scene.constructEventHandlerNode('Scene_Draw');
    
    var beginDrawOpaqueObjectsEventHandler = scene.constructEventHandlerNode('Scene_DrawOpaqueObjects');
    beginDrawEventHandler.appendChildEventHandler(beginDrawOpaqueObjectsEventHandler);
    
    // Transparent objects are always drawn after opaque objectsf
    var beginDrawTransparentObjectsEventHandler = scene.constructEventHandlerNode('Scene_DrawTransparentObjects');
    beginDrawEventHandler.appendChildEventHandler(beginDrawTransparentObjectsEventHandler);
    
    

    ///////////////////////////////////////////////////////////////////
    // Window <-> SceneGraph raycast event handler firewall
    var sceneRaycastEventHandler = scene.constructEventHandlerNode('Scene_raycast');

    if (sceneOptions.constructGlobalsNode) {
      globalsNode = scene.constructDependencyGraphNode('Scene_globals');

      if (sceneOptions.constructAnimationInterface) {
        // All time values are in seconds. 
        globalsNode.addMember('time', 'Scalar', 0);
        globalsNode.addMember('time_prevupdate', 'Scalar', 0);
        globalsNode.addMember('timestep', 'Scalar', 0);
        
        var isPlaying = false, animationTime = 0;
        var prevTime, playspeed = 1.0;
        var timerange = FABRIC.RT.vec2(-1,-1);
        var looping = false;
        var onAdvanceCallback;
        
        var requestAnimFrame = (function(){
          return  window.requestAnimationFrame       || 
                  window.webkitRequestAnimationFrame || 
                  window.mozRequestAnimationFrame    || 
                  window.oRequestAnimationFrame      || 
                  window.msRequestAnimationFrame     || 
                  function(/* function */ callback, /* DOMElement */ element){
                    window.setTimeout(callback, 1000 / 60);
                  };
        })();
        var setTime = function(t, timestep, redraw) {
          
          if (looping && animationTime > timerange.y){
            t = timerange.x;
          }
          animationTime = t;
          globalsNode.setBulkData({ time:[t], timestep:[timestep] } );
          
          if( onAdvanceCallback){
            onAdvanceCallback.call();
          }
          if(redraw !== false){
            scene.pub.redrawAllWindows();
            if(isPlaying){
              // Queue up the next redraw immediately. 
              requestAnimFrame( advanceTime, viewports[0].getWindowElement() );
            }
          }
        }
        var advanceTime = function() {
          var currTime = (new Date).getTime();
          var deltaTime = (currTime - prevTime)/1000;
          prevTime = (new Date).getTime();
          if (sceneOptions.fixedTimeStep) {
            // In fixed time step mode, the computer will attempt to play back
            // at exactly the given frame rate. If the frame rate cannot be achieved
            // it plays as fast as possible.
            // The time step as used throughout the graph will always be fixed at the
            // given rate. 
            var t = animationTime + sceneOptions.timeStep;
            if(deltaTime < sceneOptions.timeStep){
              var delay = (sceneOptions.timeStep - deltaTime)*1000;
              setTimeout(function(){
                  setTime(t, sceneOptions.timeStep);
                },
                delay
              );
            }else{
              setTime(t, sceneOptions.timeStep);
            }
          }
          else {
            // In this mode, the system plays back at the highest framerate possible.
            // The time step as used throughout the graph will vary according to the
            // achieved frame rate. 
            setTime(animationTime + (deltaTime * playspeed), deltaTime);
          }
        }
        /////////////////////////////////////////////////////////
        // Animation Interface
        scene.pub.animation = {
          setTime:function(t, redraw) {
            setTime(t, (t - animationTime), redraw);
          },
          getTime:function() {
            return animationTime;
          },
          setPlaybackSpeed:function(speed) {
            playspeed = speed;
          },
          getPlaybackSpeed:function() {
            return playspeed;
          },
          setTimeStep:function(val) {
            sceneOptions.timeStep = val;
          },
          getTimeStep:function() {
            return sceneOptions.timeStep;
          },
          setTimeRange:function(val) {
            if (!val.getType || val.getType() !== 'FABRIC.RT.Vec2') {
              throw ('Incorrect type assignment. Must assign a FABRIC.RT.Vec2');
            }
            timerange = val;
          },
          getTimeRange:function() {
            return timerange;
          },
          setLoop:function(loop) {
            looping = loop;
          },
          getLoop:function() {
            return looping;
          },
          play: function(callback) {
            prevTime = (new Date).getTime();
            isPlaying = true;
            onAdvanceCallback = callback;
            // Note: this is a big ugly hack to work arround the fact that
            // we have zero or more windows. What happens when we have
            // multiple viewports? Should the 'play' controls be moved to
            // Viewport?
            requestAnimFrame( advanceTime, viewports[0].getWindowElement() );
          },
          isPlaying: function(){
            return isPlaying;
          },
          pause: function() {
            isPlaying = false;
          },
          reset: function() {
            isPlaying = false;
            animationTime = 0.0;
            globalsNode.setData('time', 0.0);
          },
          step: function() {
            advanceTime();
          }
        };

      }
    }

    // only return the public interface to the outside world
    return scene.pub;
  }
};

FABRIC.SceneGraph.registerNodeType('SceneGraphNode', {
  briefDesc: 'The base class for the SceneGraphNodes.',
  detailedDesc: 'The SceneGraphNode is a basic wrapper for Fabric\'s DGNode. Each SceneGraphNode can '+
                'contain several DGNodes. Furthermore the SceneGraphNode implements the concept of a '+
                'private and public interface. All methods which are public (outside of the scope of) '+
                'a constructor) are added to the "pub" member of the SceneGraphNode, whereas private '+
                'methods (inside of the scope of a constructor) are attached to the SceneGraphNode '+
                'object itself.',
  factoryFn: function(options, scene) {

    var dgnodes = {};
    var eventnodes = {};
    var eventhandlernodes = {};

    var capitalizeFirstLetter = function(str) {
      return str[0].toUpperCase() + str.substr(1);
    };
    
    // ensure the name is unique
    var name = options.name ? options.name : options.type;
    if (scene.pub.getSceneGraphNode(name)) {
      var prefix = 1;
      while (scene.pub.getSceneGraphNode(name + prefix)) {
        prefix++;
      }
      name = name + prefix;
    }
    options.name = name;

    var sceneGraphNode = {
      pub: {
        getName: function() {
          return name;
        },
        getType: function() {
          return options.type;
        }
      },
      addMemberInterface : function(corenode, memberName, defineSetter) {
        var getterName = 'get' + capitalizeFirstLetter(memberName);
        sceneGraphNode.pub[getterName] = function(sliceIndex){
          return corenode.getData(memberName, sliceIndex);
        }
        if(defineSetter===true){
          var setterName = 'set' + capitalizeFirstLetter(memberName);
          sceneGraphNode.pub[setterName] = function(value, sliceIndex){
            corenode.setData(memberName, sliceIndex?sliceIndex:0, value);
          }
        }
      },
      constructDGNode: function(dgnodename, isResourceLoad) {
        if(dgnodes[dgnodename]){
          throw "SceneGraphNode already has a " + dgnodename;
        }
        var dgnode = scene.constructDependencyGraphNode(name + '_' + dgnodename, isResourceLoad);
        dgnode.sceneGraphNode = sceneGraphNode;
        sceneGraphNode['get' + dgnodename] = function() {
          return dgnode;
        };
        sceneGraphNode['add' + dgnodename + 'Member'] = function(
            memberName,
            memberType,
            defaultValue,
            defineGetter,
            defineSetter) {
          dgnode.addMember(memberName, memberType, defaultValue);
          if(defineGetter){
            sceneGraphNode.addMemberInterface(dgnode, memberName, defineSetter);
          };
        };
        dgnodes[dgnodename] = dgnode;
        return dgnode;
      },
      constructResourceLoadNode: function(dgnodename) {
        return sceneGraphNode.constructDGNode(dgnodename, true);
      },
      constructEventHandlerNode: function(ehname) {
        var eventhandlernode = scene.constructEventHandlerNode(name + '_' + ehname);
        eventhandlernode.sceneGraphNode = sceneGraphNode;
        sceneGraphNode['get' + ehname + 'EventHandler'] = function() {
          return eventhandlernode;
        };
        sceneGraphNode['add' + ehname + 'Member'] = function(
            memberName,
            memberType,
            defaultValue,
            defineGetter,
            defineSetter){
          eventhandlernode.addMember(memberName, memberType, defaultValue);
          if(defineGetter) {
            sceneGraphNode.addMemberInterface(eventhandlernode, memberName, defineSetter);
          }
        };
        eventhandlernodes[ehname] = eventhandlernode;
        return eventhandlernode;
      },
      constructEventNode: function(eventname) {
        eventnode = scene.constructEventNode(name + '_' + eventname);
        eventnode.sceneGraphNode = sceneGraphNode;
        eventnodes[eventname] = eventnode;
        return eventnode;
      }
    }


    // store it to the map
    scene.setSceneGraphNode(name, sceneGraphNode);
    
    return sceneGraphNode;
  }});

FABRIC.SceneGraph.registerNodeType('Viewport', {
  briefDesc: 'The Viewport node implements the basic OpenGL canvas.',
  detailedDesc: 'Utilizing a redraw eventhandler, the ViewPort node offers a powerful OpenGL canvas, ' +
                'which is connected to an embed element inside the DOM. The most important parameter of '+
                'the ViewPort node\'s options is the windowElement, the ID of the HTML element to append '+
                'the viewport to.',
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
        windowElement: undefined,
        cameraNode: undefined,
        enableMouseEvents: true,
        enableRaycasting: false,
        mouseUpEvents: true,
        mouseMoveEvents: true,
        backgroundColor: FABRIC.RT.rgb(0.5, 0.5, 0.5),
        postProcessEffect: undefined,
        rayIntersectionThreshold: 0.2
      });

    if (!options.windowElement) {
      throw ('Must provide a window to this constructor');
    }

    var cameraNode, fabricwindow;
    var windowElement = options.windowElement;
    var viewportNode = scene.constructNode('SceneGraphNode', options),
      dgnode = viewportNode.constructDGNode('DGNode'),
      redrawEventHandler = viewportNode.constructEventHandlerNode('Redraw');
      
    dgnode.addMember('backgroundColor', 'Color', options.backgroundColor);

    redrawEventHandler.addScope('viewPort', dgnode);

    redrawEventHandler.preDescendBindings.append(scene.constructOperator({
          operatorName: 'viewPortBeginRender',
          srcFile: 'FABRIC_ROOT/SceneGraph/KL/viewPortBeginRender.kl',
          entryFunctionName: 'viewPortBeginRender',
          parameterLayout: [
            'window.width',
            'window.height',
            'viewPort.backgroundColor'
          ]
        }));

    FABRIC.appendOnResolveAsyncTaskCallback(function(label, countRemaining){
      if(countRemaining===0){
        fabricwindow = scene.bindViewportToWindow(windowElement, viewportNode);
        redrawEventHandler.addScope('window', fabricwindow.windowNode);
        if(scene.getScenePreRedrawEventHandler()){
          fabricwindow.redrawEvent.appendEventHandler(scene.getScenePreRedrawEventHandler());
        }
        fabricwindow.redrawEvent.appendEventHandler(redrawEventHandler);
        if(scene.getScenePostRedrawEventHandler()){
          fabricwindow.redrawEvent.appendEventHandler(scene.getScenePostRedrawEventHandler());
        }
        if(viewPortRayCastDgNode){
          viewPortRayCastDgNode.addDependency(fabricwindow.windowNode, 'window');
        }
        return true; // remove this event listener. 
      }
    });
    var propagationRedrawEventHandler = viewportNode.constructEventHandlerNode('DrawPropagation');
    redrawEventHandler.appendChildEventHandler(propagationRedrawEventHandler);

    // Texture Stub for loading Background textures.
    var backgroundTextureNode, textureStub, textureStubdgnode;
    textureStub = viewportNode.constructEventHandlerNode('BackgroundTextureStub');
    propagationRedrawEventHandler.appendChildEventHandler(textureStub);

    var postProcessEffects = [];

    ///////////////////////////////////////////////////////////////////
    // Raycasting
    var viewPortRaycastEvent, viewPortRaycastEventHandler, viewPortRayCastDgNode;
    if (scene.getSceneRaycastEventHandler() && options.enableRaycasting) {

      viewPortRayCastDgNode = scene.constructDependencyGraphNode(options.name + '_RayCastNode');
      viewPortRayCastDgNode.addMember('x', 'Integer');
      viewPortRayCastDgNode.addMember('y', 'Integer');
      viewPortRayCastDgNode.addMember('ray', 'Ray');
      viewPortRayCastDgNode.addMember('threshold', 'Scalar', options.rayIntersectionThreshold);

      // this operator calculates the rayOri and rayDir from the scopes collected so far.
      // The scopes should be the window, viewport, camera and projection.
      viewPortRayCastDgNode.bindings.append(scene.constructOperator({
        operatorName: 'ViewportRaycast',
        srcFile: 'FABRIC_ROOT/SceneGraph/KL/viewPortUpdateRayCast.kl',
        entryFunctionName: 'viewPortUpdateRayCast',
        parameterLayout: [
          'camera.cameraMat44',
          'camera.projectionMat44',
          'window.width',
          'window.height',
          'self.x',
          'self.y',
          'self.ray'
        ]
      }));

      viewPortRaycastEventHandler = viewportNode.constructEventHandlerNode('Raycast');
      viewPortRaycastEventHandler.addScope('raycastData', viewPortRayCastDgNode);

      // Raycast events are fired from the viewport. As the event
      // propagates down the tree it collects scopes and fires operators.
      // The operators us the collected scopes to calculate the ray.
      viewPortRaycastEvent = viewportNode.constructEventNode('RaycastEvent');
      viewPortRaycastEvent.appendEventHandler(viewPortRaycastEventHandler);

      // the sceneRaycastEventHandler propogates the event throughtout the scene.
      viewPortRaycastEventHandler.appendChildEventHandler(scene.getSceneRaycastEventHandler());

    }

    var getElementCoords = function(evt) {
      if (evt.offsetX) {
        return FABRIC.RT.vec2(evt.offsetX, evt.offsetY);
      }
      else if (evt.layerX) {
        return FABRIC.RT.vec2(evt.layerX, evt.layerY);
      }
      throw("Unsupported Browser");
    }

    // private interface
    viewportNode.getWindowElement = function() {
      return windowElement;
    };
    viewportNode.getFabricWindowObject = function() {
      return fabricwindow;
    };

    // public interface
    viewportNode.addMemberInterface(dgnode, 'backgroundColor', true);
    viewportNode.pub.setCameraNode = function(node) {
      if (!node || !node.isTypeOf('Camera')) {
        throw ('Incorrect type assignment. Must assign a Camera');
      }
      cameraNode = scene.getPrivateInterface(node);
      propagationRedrawEventHandler.appendChildEventHandler(cameraNode.getRedrawEventHandler());
      if (viewPortRayCastDgNode) {
        viewPortRayCastDgNode.addDependency(cameraNode.getDGNode(), 'camera');
      }
    };
    viewportNode.pub.getCameraNode = function() {
      return cameraNode.pub;
    };
    viewportNode.pub.setBackgroundTextureImage = function(textureNode) {
      if (!textureStubdgnode) {
        textureStub.setScopeName('textureStub');
        textureStub.addMember('textureUnit', 'Integer', 0);
        textureStub.addMember('program', 'Integer', 0);
        textureStub.postDescendBindings.append(
          scene.constructOperator({
              operatorName: 'drawTextureFullScreen',
              srcFile: 'FABRIC_ROOT/SceneGraph/KL/drawTexture.kl',
              entryFunctionName: 'drawTextureFullScreen',
              parameterLayout: [
                'self.textureUnit',
                'self.program'
              ]
            }
         ));
      }
      if (!textureNode.isTypeOf('Texture')) {
        throw ('Incorrect type assignment. Must assign a Texture');
      }
      if (backgroundTextureNode) {
        textureStub.removeChildEventHandler(backgroundTextureNode.getRedrawEventHandler());
      }
      backgroundTextureNode = scene.getPrivateInterface(textureNode);
      textureStub.appendChildEventHandler(backgroundTextureNode.getRedrawEventHandler());
    };
    viewportNode.pub.addPostProcessEffectShader = function(postProcessEffect) {
      if (!postProcessEffect.isTypeOf('PostProcessEffect')) {
        throw 'Object is not a PostProcessEffect node.';
      }
      postProcessEffect = scene.getPrivateInterface(postProcessEffect);

      var parentEventHandler;
      if (postProcessEffects.length > 0) {
        parentEventHandler = postProcessEffects[postProcessEffects.length - 1].getRedrawEventHandler();
      }
      else {
        parentEventHandler = redrawEventHandler;
      }
      parentEventHandler.removeChildEventHandler(propagationRedrawEventHandler);
      parentEventHandler.appendChildEventHandler(postProcessEffect.getRedrawEventHandler());

      postProcessEffect.getRedrawEventHandler().appendChildEventHandler(propagationRedrawEventHandler);
      postProcessEffects.push(postProcessEffect);
    };
    viewportNode.pub.removePostProcessEffectShader = function(postProcessEffect) {
      postProcessEffect = scene.getPrivateInterface(postProcessEffect);
      var filterIndex = postProcessEffects.indexOf(postProcessEffect);
      if (filterIndex == -1) {
        throw ('Filter not applied: ' + postProcessEffect.name);
      }
      var parentEventHandler, childEventHandler;
      postProcessEffects.splice(filterIndex, 1);
      if(filterIndex < postProcessEffects.length){
        childEventHandler = postProcessEffects[filterIndex].getRedrawEventHandler();
      }
      else{
        childEventHandler = propagationRedrawEventHandler;
      }
      postProcessEffect.getRedrawEventHandler().removeChildEventHandler(childEventHandler);
      
      if (filterIndex > 0) {
        parentEventHandler = postProcessEffects[filterIndex - 1].getRedrawEventHandler();
      }
      else {
        parentEventHandler = redrawEventHandler;
      }
      parentEventHandler.removeChildEventHandler(postProcessEffect.getRedrawEventHandler());
      if (filterIndex < postProcessEffects.length) {
        parentEventHandler.appendChildEventHandler(postProcessEffects[filterIndex].getRedrawEventHandler());
      }
      else {
        parentEventHandler.appendChildEventHandler(propagationRedrawEventHandler);
      }
    };
    viewportNode.pub.rayCast = function(evt, options) {
      options = scene.assignDefaults(options, {
          returnOnlyClosestNode: true
        });
      var elementCoords = getElementCoords(evt);
      viewPortRayCastDgNode.setData('x', elementCoords.x);
      viewPortRayCastDgNode.setData('y', elementCoords.y);
      var nodes = viewPortRaycastEvent.select('RayIntersection');
      var result = {
        rayData: viewPortRayCastDgNode.getData('ray')
      };
      if (options.returnOnlyClosestNode) {
        for (var i = 0; i < nodes.length; i++) {
          if (!result.closestNode || nodes[i].value.distance < result.closestNode.value.distance) {
            result.closestNode = nodes[i];
          }
        }
        return result;
      }else {
        result.nodes = nodes;
        return result;
      }
    };
    viewportNode.pub.calcRayFromMouseEvent = function(evt) {
      var elementCoords = getElementCoords(evt);
      viewPortRayCastDgNode.setData('x', elementCoords.x);
      viewPortRayCastDgNode.setData('y', elementCoords.y);
      viewPortRayCastDgNode.evaluate();
      var ray = viewPortRayCastDgNode.getData('ray');
      return ray;
    };
    viewportNode.pub.redraw = function(animating) {
      fabricwindow.needsRedraw();
    };
    viewportNode.pub.writeData = function(sceneSaver, constructionOptions, nodeData) {
      nodeData.camera = sceneSaver.wrapQuotes(cameraNode.name);
    };
    viewportNode.pub.readData = function(sceneLoader, nodeData) {
      if (nodeData.camera) {
        this.setCameraNode(sceneLoader.getNode(nodeData.camera));
      }
    };
    viewportNode.pub.getFPS = function() {
      // TODO: once we have support for multiple viewports, we should
      // re-write this function.
      return scene.getContext().VP.viewPort.getFPS();
    };

    if (options.postProcessEffect) {
      viewportNode.pub.addPostProcessEffectShader(options.postProcessEffect);
    }

    if (options.enableMouseEvents) {
      ///////////////////////////////////////////////////////////////////
      // Add Mouse Handling Events
      var mouseOverNode;
      var mouseOverNodeData;
      var propagateEvent = true;
      var bindEventProperties = function(evt) {
        evt.scene = scene.pub;
        evt.viewportNode = viewportNode.pub;
        if (cameraNode) {
          evt.cameraNode = cameraNode.pub;
        }
        propagateEvent = true;
        var stopPropagation = evt.stopPropagation;
        evt.stopPropagation = function() {
          propagateEvent = false;
          stopPropagation.call(evt);
        }
      }

      var fireEvent = function(name, evt, targetNode) {
        bindEventProperties(evt);
        if (cameraNode) {
          cameraNode.pub.fireEvent(name, evt);
        }
        if (propagateEvent) viewportNode.pub.fireEvent(name, evt);
        if (propagateEvent) scene.pub.fireEvent(name, evt);
      }

      // The mouse has interacted in some way with a geometry.
      // fire an event for objects to handle thier own interaction.
      var fireGeomEvent = function(name, evt, targetNode) {
        bindEventProperties(evt);
        evt.targetNode = targetNode.pub;
        evt.targetNode.fireEvent(name, evt);
        evt.viewportNode = viewportNode;
        if (propagateEvent) cameraNode.pub.fireEvent(name, evt);
        if (propagateEvent) viewportNode.pub.fireEvent(name, evt);
        if (propagateEvent) scene.pub.fireEvent(name, evt);
      }

      var mouseMoveFn = function(evt) {
        propagateEvent = true;
        if (cameraNode && viewPortRayCastDgNode && options.mouseMoveEvents) {
          var raycastResult = viewportNode.pub.rayCast(evt);
          if (raycastResult.closestNode) {
            var hitNode = raycastResult.closestNode.node.sceneGraphNode;
            evt.rayData = raycastResult.rayData;
            evt.hitData = raycastResult.closestNode.value;
            if (mouseOverNode == undefined ||
                mouseOverNode.pub.getName() !== hitNode.pub.getName()) {
              if (mouseOverNode) {
                evt.toElement = hitNode;
                evt.hitData = mouseOverNodeData;
                fireGeomEvent('mouseout_geom', evt, mouseOverNode);
              }
              evt.fromElement = evt.relatedTarget = mouseOverNode;
              fireGeomEvent('mouseover_geom', evt, hitNode);
              mouseOverNode = hitNode;
              mouseOverNodeData = evt.hitData;
            }else {
              fireGeomEvent('mousemove_geom', evt, hitNode);
            }
          }
          else {
            if (mouseOverNode) {
              evt.hitData = mouseOverNodeData;
              fireGeomEvent('mouseout_geom', evt, mouseOverNode);
              mouseOverNode = undefined;
            }
          }
        }
        if(propagateEvent){
          fireEvent('mousemove', evt);
        }
      };

      var mouseDownFn = function(evt) {
        propagateEvent = true;
        if (cameraNode && viewPortRayCastDgNode) {
          var raycastResult = viewportNode.pub.rayCast(evt);
          if (raycastResult.closestNode) {
            var hitNode = raycastResult.closestNode.node.sceneGraphNode;
            evt.rayData = raycastResult.rayData;
            evt.hitData = raycastResult.closestNode.value;
            fireGeomEvent('mousedown_geom', evt, hitNode);
          }
        }
        if(propagateEvent){
          fireEvent('mousedown', evt);
        }
      };

      var mouseUpFn = function(evt) {
        propagateEvent = true;
        if (cameraNode && viewPortRayCastDgNode && options.mouseUpEvents) {
          var raycastResult = viewportNode.pub.rayCast(evt);
          if (raycastResult.closestNode) {
            var hitNode = raycastResult.closestNode.node.sceneGraphNode;
            evt.rayData = raycastResult.rayData;
            evt.hitData = raycastResult;
            fireGeomEvent('mouseup_geom', evt, hitNode);
          }
        }
        if(propagateEvent){
          fireEvent('mouseup', evt);
        }
      };

      // In cases wehre mouse events cost a lot, we can restrict firing to mouse down and moue up.
      windowElement.addEventListener('mousemove', mouseMoveFn, false);
      windowElement.addEventListener('mousedown', mouseDownFn, false);
      windowElement.addEventListener('mouseup', mouseUpFn, false);

      // Mouse Wheel event trapping.
      // Mouse wheel events are sent to the document, not the element,
      // so here we catch mouse wheel events only when the mouse goes over the element.
      // TODO: Fix Safari mouse wheel events..
      var mouseWheelActivated = false;
      var activateMousewheelFn = function(evt) {
        if(mouseWheelActivated){
          return;
        }
        var mousewheelFn = function(evt) {
          fireEvent('mousewheel', evt);
        }
        document.addEventListener('mousewheel', mousewheelFn, false);
        var deactivateMousewheelFn = function(evt) {
          windowElement.removeEventListener('mouseout', deactivateMousewheelFn, false);
          document.removeEventListener('mousewheel', mousewheelFn, false);
          mouseWheelActivated = false;
        }
        windowElement.addEventListener('mouseout', deactivateMousewheelFn, false);
        mouseWheelActivated = true;
      }
      windowElement.addEventListener('mousemove', activateMousewheelFn, false);
      scene.addEventHandlingFunctions(viewportNode);
    }

    if (options.cameraNode) {
      viewportNode.pub.setCameraNode(options.cameraNode);
    }

    return viewportNode;
  }});

  FABRIC.SceneGraph.registerNodeType('ResourceLoad', {
  briefDesc: 'The ResourceLoad node implements the loading of a resource from an URL.',
  detailedDesc: 'Based on is \'url\' member, the ResourceLoad node will asynchronously load the associated ' +
                'resource to its \'resource\' member. Until the data is loaded, resource.dataSize will be zero. ' +
                'Once the data is loaded, JS callbacks will be fired; you can register those by calling the ' +
                '\'addOnLoadCallback\' member function. Unless \'option.redrawOnLoad\' is set to false, the loading ' +
                'will automatically trigger a redraw. Note that operators can dynamically modify the URL.',
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
      redrawOnLoad: true,
      onLoadCallback: undefined
    });

    var onloadCallbacks = [];
    lastLoadCallbackURL = '';

    var resourceLoadNode = scene.constructNode('SceneGraphNode', options);
    var dgnode = resourceLoadNode.constructResourceLoadNode('DGLoadNode');

    resourceLoadNode.addMemberInterface(dgnode, 'url', true);
    resourceLoadNode.addMemberInterface(dgnode, 'resource');

    dgnode.addOnLoadCallback(function() {
      var i;
      lastLoadCallbackURL = resourceLoadNode.pub.getUrl();
      for (i = 0; i < onloadCallbacks.length; i++) {
        onloadCallbacks[i](resourceLoadNode.pub);
      }
      onloadCallbacks = [];

      if (options.redrawOnLoad) {
        scene.pub.redrawAllWindows();
      }
    });

    resourceLoadNode.pub.isLoaded = function() {
      return lastLoadCallbackURL !== '' && lastLoadCallbackURL === resourceLoadNode.pub.getUrl();
    }

    resourceLoadNode.pub.addOnLoadCallback = function(callback) {
      //It is possible that a resourceLoadNode actually loads multiple resources in a sequence;
      //make sure the callback is only fired when the 'next' resource is loaded.
      if (resourceLoadNode.pub.isLoaded()) {
        callback.call(); //Already loaded
      } else {
        onloadCallbacks.push(callback);
      }
    };

    resourceLoadNode.pub.getDGNode = function() {
      return dgnode;
    }

    if (options.onLoadCallback) {
      resourceLoadNode.pub.addOnLoadCallback(options.onLoadCallback);
    }

    if (options.url) {
      resourceLoadNode.pub.setUrl(options.url);
    }

    return resourceLoadNode;
  }});

FABRIC.SceneGraph.registerNodeType('Camera', {
  briefDesc: 'The Camera node implements an OpenGL camera for the ViewPort node.',
  detailedDesc: 'The Camera node uses a redraw event handler to draw the camera projection to '+
                'the OpenGL canvas.',
  factoryFn: function(options, scene) {

    scene.assignDefaults(options, {
        nearDistance: 5,
        farDistance: 1000,
        fovY: 60,
        focalDistance: 160,
        orthographic: false,
        transformNode: 'Transform'
      });

    var cameraNode = scene.constructNode('SceneGraphNode', options),
      dgnode = cameraNode.constructDGNode('DGNode'),
      redrawEventHandler = cameraNode.constructEventHandlerNode('Redraw'),
      transformNode,
      transformNodeMember = 'globalXfo';
      
    dgnode.addMember('nearDistance', 'Scalar', options.nearDistance);
    dgnode.addMember('farDistance', 'Scalar', options.farDistance);
    dgnode.addMember('fovY', 'Scalar', Math.degToRad(options.fovY));
    dgnode.addMember('focalDistance', 'Scalar', options.focalDistance);
    dgnode.addMember('cameraMat44', 'Mat44');
    dgnode.addMember('orthographic', 'Boolean', options.orthographic);
    dgnode.addMember('projectionMat44', 'Mat44');

    redrawEventHandler.addScope('camera', dgnode);

    redrawEventHandler.preDescendBindings.append(scene.constructOperator({
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
        'camera.orthographic'
      ]
    }));

    // Now register the camera with the Scene Graph so that
    // It will connect the camera with the scene graph rendered elements.(shaders etc)
    redrawEventHandler.appendChildEventHandler(scene.getSceneRedrawEventHandler());

    // public interface
    cameraNode.pub.getTransformNode = function() {
      return transformNode.pub;
    };
    cameraNode.pub.setTransformNode = function(node, member) {
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
      dgnode.addDependency(transformNode.getDGNode(), 'transform');

      dgnode.bindings.append(scene.constructOperator({
        operatorName: 'loadXfo',
        srcCode: 'use Xfo, Mat44; operator loadXfo(io Xfo xfo, io Mat44 mat44){ mat44 = Mat44(xfo); mat44 = mat44.inverse(); }',
        entryFunctionName: 'loadXfo',
        parameterLayout: [
          'transform.' + transformNodeMember,
          'self.cameraMat44'
        ]
      }));
    };
    cameraNode.addMemberInterface(dgnode, 'cameraMat44');
    cameraNode.addMemberInterface(dgnode, 'projectionMat44');
    cameraNode.addMemberInterface(dgnode, 'nearDistance', true);
    cameraNode.addMemberInterface(dgnode, 'farDistance', true);
    cameraNode.addMemberInterface(dgnode, 'fovY', true);
    cameraNode.addMemberInterface(dgnode, 'focalDistance', true);

    scene.addEventHandlingFunctions(cameraNode);

    if (typeof options.transformNode == 'string') {
      cameraNode.pub.setTransformNode(scene.constructNode(options.transformNode, { hierarchical: false }).pub);
    }else {
      cameraNode.pub.setTransformNode(options.transformNode);
    }
    return cameraNode;
  }});



FABRIC.SceneGraph.registerNodeType('FreeCamera', {
  briefDesc: 'The FreeCamera node implements an OpenGL camera in a free roaming mode.',
  detailedDesc: 'The FreeCamera node uses the Camera node to implement a free roaming camera without a target point.',
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
        position: FABRIC.RT.vec3(1, 0, 0),
        orientation: FABRIC.RT.quat()
      });

    options.transformNode = scene.constructNode('Transform', {
      globalXfo: FABRIC.RT.xfo({ tr: options.position, ori: options.orientation })
    });

    var freeCameraNode = scene.constructNode('Camera', options);

    return freeCameraNode;
  }});



FABRIC.SceneGraph.registerNodeType('TargetCamera', {
  briefDesc: 'The TargetCamera node implements an OpenGL camera in using a target point',
  detailedDesc: 'The TargetCamera node uses the Camera node to implement a camera with a target point, similar to the GLUT lookat camera.',
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
        target: FABRIC.RT.vec3(0, 0, 0)
      });

    options.transformNode = scene.pub.constructNode('AimTransform', {
      globalXfo: options.globalXfo,
      position: options.position,
      target: options.target
    });

    var targetCameraNode = scene.constructNode('Camera', options);

    targetCameraNode.getDGNode().bindings.append(scene.constructOperator({
      operatorName: 'loadFocalDist',
      srcCode: 'use Xfo, Vec3; operator loadFocalDist(io Xfo xfo, io Vec3 target, io Scalar focalDist){' +
      '  focalDist = xfo.tr.dist(target);' +
      '}',
      entryFunctionName: 'loadFocalDist',
      parameterLayout: [
        'transform.globalXfo',
        'transform.target',
        'self.focalDistance'
      ]
    }));

    return targetCameraNode;
  }});


