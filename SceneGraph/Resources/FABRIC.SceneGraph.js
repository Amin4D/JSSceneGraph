
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//

/**
 * The scene graph is the core implementation of Fabric's
 * node graph in javascript.
 */
FABRIC.SceneGraph = {
  nodeFactories: {},
  assetLoaders: {},
  registerNodeType: function(type, factoryFn) {
    if (this.nodeFactories[type]) {
      throw ('Node Constructor already Registered:' + type);
    }else {
      this.nodeFactories[type] = factoryFn;
    }
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

    // first let's create the basic scene object
    // we will have a private (complete) as well as
    // a public interface, which we will return from this
    // function
    var scene = {
      pub: {
      }
    };

    // Now we create a context. The context is a container for all
    // data relating to this scene graph. A single HTML file can
    // define multiple scene graphs with separate contexts.
    var context = FABRIC.createContext();

    // [pzion 20110326] Add a context menu item for any windows
    // in the context that pops up a Fabric debugger for the context
    context.addPopUpItem(
      'Fabric debugger...',
      function(arg) {
        scene.displayDebugger();
      },
      null);

    // EAch Viewport creates a new fabricwindow which is the origin of
    // window redraw events.
    var windows = [];

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
    scene.addWindow = function(element, options) {
      var fabricwindow = context.createWindow(element, options);
      windows.push(fabricwindow);
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
    scene.assignDefaults = function(options, defaults, force) {
      if (!options) options = {};
      for (i in defaults) {
        if (options[i] === undefined || force) options[i] = defaults[i];
      }
      return options;
    };
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
    scene.loadResourceURL = function(url) {
      var data = FABRIC.loadResourceURL(url);
      return data;
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
    scene.constructResourceLoadEventNode = function(url) {
      return context.DependencyGraph.createResourceLoadEvent('RLE: ' + url, url);
    };
    scene.constructEventHandlerNode = function(name) {
      return context.DependencyGraph.createEventHandler(name);
    };
    scene.constructDependencyGraphNode = function(name) {
      return context.DependencyGraph.createNode(name);
    };

    scene.constructNode = function(type, options) {
      if (!FABRIC.SceneGraph.nodeFactories[type]) {
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

      options.dgnodenames = options.dgnodenames ? options.dgnodenames : [];

      var sceneGraphNode = FABRIC.SceneGraph.nodeFactories[type].call(undefined, options, scene);
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
    scene.constructOperator = function(operatorDef) {
      var uid,
        def,
        includedCodeSections = [],
        code,
        descDiags,
        operator,
        constructBinding;

      constructBinding = function(op) {
        var binding = context.DG.createBinding();
        binding.setOperator(op);
        binding.setParameterLayout(operatorDef.parameterBinding);
        return binding;
      }

      uid = operatorDef.operatorName;
      for (def in operatorDef.preProcessorDefinitions) {
        uid = uid + def + operatorDef.preProcessorDefinitions[def];
      }
      if (operatorStore[uid]) {
        return constructBinding(operatorStore[uid]);
      }

      ///////////////////////////////////////////////////
      // Construct the operator
      code = operatorDef.srcCode;
      if (!code) {
        code = this.loadResourceURL(operatorDef.srcFile);
        if (!code) {
          throw ('Source File not found:' + operatorDef.srcFile);
        }
      }
      code = this.preProcessCode.call(this, code, operatorDef.preProcessorDefinitions, includedCodeSections);

      operator = context.DG.createOperator(uid);

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

      var compileKL = function(code) {
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
          throw descDiags(operator.getFullSourceCode(), diagnostics);
        }
      }
      compileKL(code);
      operatorStore[uid] = operator;

      return constructBinding(operator);
    };
    //////////////////////////////////////////////////////////
    // Accessors
    scene.getGlobalsNode = function() {
      return globalsNode;
    };
    scene.getScenePreRedrawEventHandler = function() {
      return preDrawEventHandler;
    };
    scene.getSceneRedrawEventHandler = function() {
      return beginDrawEventHandler;
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
        shadowMapMaterial = this.pub.constructNode('ShadowMaterial', {
          parentEventHandler: beginRenderShadowMap
        });
      }
      return shadowMapMaterial;
    };
    //////////////////////////////////////////////////////////
    // This method decorates the passed in sceneGraphNode with methods to
    // add members, operators, and denpendencies.
    // One day we will want to build a persistence layer for the scene graph
    // and so these changes will need to be recorded ready for persisting.
    scene.addMemberAndOperatorStackFunctions = function(sceneGraphNode, dgnode) {
      sceneGraphNode.getMembers = function() {
        return dgnode.getMembers();
      };
      sceneGraphNode.addMember = function(name, type, defaultval) {
        if (defaultval) {
          dgnode.addMember(name, type, defaultval);
        }else {
          dgnode.addMember(name, type);
        }
      };
      sceneGraphNode.setCount = function(count) {
        dgnode.setCount(count);
      };
      sceneGraphNode.setData = function(memberName, data) {
        var nodeInstanceMembers = dgnode.getMembers();
        if (!nodeInstanceMembers[memberName]) {
          throw ("Node '" + nodeInstanceName + "' Does not contain member :" + memberName);
        }
        var memberType = nodeInstanceMembers[memberName].type;

        // Note: Currently it is ambiguous whether we are setting an Array member, or
        // each element in a sliced node.
        if ((typeof data) === 'object' && data.constructor.name === 'Array' &&
          memberType.substr(-2) !== '[]') {
          for (var i = 0; i < data.length; i++) {
            dgnode.setData(memberName, i, data[i]);
          }
        }else {
          dgnode.setData(memberName, 0, data);
        }
      };
      sceneGraphNode.appendOperator = function(operatorDef) {
        var binding;

        if ('getParameterLayout' in operatorDef)
          binding = operatorDef;
        else
          binding = scene.constructOperator(operatorDef);

        dgnode.bindings.append(binding);
      };
      sceneGraphNode.insertOperator = function(operatorDef, beforeIndex) {
        var binding;

        if ('getParameterLayout' in operatorDef)
          binding = operatorDef;
        else
          binding = scene.constructOperator(operatorDef);

        dgnode.bindings.insert(binding, beforeIndex);
      };
      sceneGraphNode.addDependency = function(dependencydgnode, dependencyName) {
        dgnode.addDependency(dependencydgnode, dependencyName);
      };
      return sceneGraphNode;
    };
    scene.addMemberInterface = function(sgnode, dgnode, memberName, createSetter) {
      var pub = sgnode.pub;
      pub.__defineGetter__(memberName, function() {
        return dgnode.getData(memberName, 0);
      });
      if (createSetter) {
        pub.__defineSetter__(memberName, function(val) {
          dgnode.setData(memberName, 0, val);
        });
      }
    };
    scene.addMemberGetter = function(sgnode, dgnode, memberName) {
      setCharAt = function(str, index, chr) {
        if (index > str.length - 1) {
          return str;
        }
        return str.substr(0, index) + chr + str.substr(index + 1);
      };
      var getterName = 'get' + setCharAt(memberName, 0, memberName[0].toUpperCase());
      sgnode.pub[getterName] = function() {
        return dgnode.getData(memberName, 0);
      };
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
    scene.addFileReadWriteFunctions = function(sceneGraphNode, dgnode) {
      if (sceneGraphNode.loadResourceFile) {
        return;
      }
      sceneGraphNode.loadResourceURL = function(filepath) {
        var datablob = scene.loadResourceURL(filepath);
        if (datablob) {
          dgnode.setBinary(datablob);
        }else {
          throw ('File not found:' + filepath);
        }
      };
      sceneGraphNode.loadResourceFile = function(filepath) {
        var datablob = scene.readResourceFile(filepath);
        if (datablob) {
          dgnode.setBinary(datablob);
        }else {
          throw ('File not found:' + filepath);
        }
      };
    };

    /////////////////////////////////////////////////////////////////////
    // Public Scene Interface
    sceneOptions = sceneOptions ? sceneOptions : {};
    scene.assignDefaults(sceneOptions, {
        constructGlobalsNode: true,
        constructAnimationInterface: true,
        fixedTimeStep: true,
        timeStep: 20
      });

    scene.pub.displayDebugger = function() {
      var debuggerWindow = window.open(
        'FABRIC_ROOT/Core/Debugger/FABRIC.Debugger.html?id=' + context.getContextID() , 'Fabric Debugger');
      debuggerWindow.context = context;
      debuggerWindow.scene = scene;
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
      for (i in windows) {
        if (windows.hasOwnProperty(i)) {
          windows[i].needsRedraw();
        }
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
    var preDrawEventHandler = scene.constructEventHandlerNode('Scene_PreDraw');


    ///////////////////////////////////////////////////////////////////
    // Shadowcasting Lightsource <-> SceneGraph draw event handler firewall
    var propagateRenderShadowMapEvent = scene.constructEventHandlerNode('propagateRenderShadowMapEvent');
    var beginRenderShadowMap = scene.constructEventHandlerNode('beginRenderShadowMap');
    // The shadow map shader is constructed on demand.
    var shadowMapMaterial;

    // The 'Parent' node is the first child of the scene redraw event.
    // This means that the event traversial will propagate down the
    // shadow casting graph, before propagating down the render graph.
    preDrawEventHandler.appendChildEventHandler(propagateRenderShadowMapEvent);


    ///////////////////////////////////////////////////////////////////
    // All scene draw event handlers(shaders) are attached to this handler.
    var beginDrawEventHandler = scene.constructEventHandlerNode('Scene_Draw');

    ///////////////////////////////////////////////////////////////////
    // Window <-> SceneGraph raycast event handler firewall
    var sceneRaycastEventHandler = scene.constructEventHandlerNode('Scene_raycast');

    var globalsNode;
    if (sceneOptions.constructGlobalsNode) {
      globalsNode = scene.constructDependencyGraphNode('Scene_globals');

      if (sceneOptions.constructAnimationInterface) {

        globalsNode.addMember('ms', 'Scalar', 0);
        globalsNode.addMember('ms_prevupdate', 'Scalar', 0);
        globalsNode.addMember('timestep', 'Scalar', 0);
        globalsNode.bindings.append(scene.constructOperator({
          operatorName: 'setTimestep',
          srcCode:
            '\noperator setTimestep(io Scalar ms, io Scalar ms_prevupdate, io Scalar timestep){ \n' +
            '  timestep = ms - ms_prevupdate;\n' +
            '  ms_prevupdate = ms;\n' +
            '}',
          entryFunctionName: 'setTimestep',
          parameterBinding: [
            'self.ms',
            'self.ms_prevupdate',
            'self.timestep'
          ]
        }));

        var animationTime = 0;
        var prevTime, playspeed = 1.0;
        var advancePlayback = function() {
          if (sceneOptions.fixedTimeStep) {
            animationTime += sceneOptions.timeStep;
            scene.pub.animation.time = animationTime;
          }
          else {
            var currTime = (new Date).getTime();
            var deltaTime = currTime - prevTime;
            prevTime = currTime;
            scene.pub.animation.time = (animationTime + (deltaTime * playspeed));
          }
        }

        /////////////////////////////////////////////////////////
        // Animation Interface
        scene.pub.animation = {
          set time(t) {
            animationTime = t;
            globalsNode.setData('ms', t);
            scene.pub.redrawAllWindows();
          },
          get time() {
            return animationTime;
          },
          set playbackSpeed(speed) {
            playspeed = speed;
          },
          get playbackSpeed() {
            return playspeed;
          },
          play: function(callback) {
            prevTime = (new Date).getTime();
            // Note: this is a big ugly hack to work arround the fact that
            // we have zero or more windows. What happens when we have
            // multiple windows? Should the 'play' controls be moved to
            // Viewport?
            windows[0].setRedrawFinishedCallback(callback ? callback : advancePlayback);
            scene.pub.redrawAllWindows();
          },
          pause: function() {
            windows[0].setRedrawFinishedCallback(null);
            scene.pub.redrawAllWindows();
          },
          reset: function() {
            animationTime = 0.0;
            globalsNode.setData('ms', 0.0);
            windows[0].setRedrawFinishedCallback(null);
            scene.pub.redrawAllWindows();
          },
          step: function() {
            advancePlayback();
          }
        };

      }
    }

    // only return the public interface to the outside world
    return scene.pub;
  }
};

FABRIC.SceneGraph.registerNodeType('SceneGraphNode',
  function(options, scene) {

    var dgnodenames = options.dgnodenames ? options.dgnodenames : [];
    var dgnodes = {};

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
      }
    };
    
    // store it to the map
    scene.setSceneGraphNode(name, sceneGraphNode);

    // take care of the DG nodes
    var addDGNodeInterface = function(dgnodename) {
      dgnodes[dgnodename] = scene.constructDependencyGraphNode(name + '_' + dgnodename);
      dgnodes[dgnodename].sceneGraphNode = sceneGraphNode;
      sceneGraphNode['get' + dgnodename] = function() {
        return dgnodes[dgnodename];
      };
    }

    for (var i = 0; i < dgnodenames.length; i++) {
      addDGNodeInterface(dgnodenames[i]);
    }

    return sceneGraphNode;
  });

FABRIC.SceneGraph.registerNodeType('Viewport',
  function(options, scene) {
    scene.assignDefaults(options, {
        windowElement: undefined,
        cameraNode: undefined,
        enableMouseEvents: true,
        enableRaycasting: false,
        mouseUpEvents: true,
        mouseMoveEvents: true,
        redrawOnMouseMove: true, // This option is usefull on OsX where drawing is always a frame behind.
        backgroundColor: FABRIC.RT.rgb(0.1, 0.1, 0.1),
        postProcessEffect: undefined,
        rayIntersectionThreshold: 0.8
      });
    options.dgnodenames.push('DGNode');

    if (!options.windowElement) {
      throw ('Must provide a window to this constructor');
    }

    var cameraNode;
    var windowElement = options.windowElement;
    var fabricwindow = scene.addWindow(windowElement);

    var viewportNode = scene.constructNode('SceneGraphNode', options);
    var dgnode = viewportNode.getDGNode();
    dgnode.addMember('backgroundColor', 'Color', options.backgroundColor);
    var redrawEventHandler = scene.constructEventHandlerNode(options.name + '_RedrawEventHandler');

    redrawEventHandler.addScope('viewPort', dgnode);
    redrawEventHandler.addScope('window', fabricwindow.windowNode);

    redrawEventHandler.preDescendBindings.append(scene.constructOperator({
          operatorName: 'viewPortBeginRender',
          srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/viewPortBeginRender.kl',
          entryFunctionName: 'viewPortBeginRender',
          parameterBinding: [
            'window.width',
            'window.height',
            'viewPort.backgroundColor'
          ]
        }));


    fabricwindow.redrawEvent.appendEventHandler(scene.getScenePreRedrawEventHandler());
    fabricwindow.redrawEvent.appendEventHandler(redrawEventHandler);

    var propagationRedrawEventHandler = scene.constructEventHandlerNode(
      options.name + '_propagationRedrawEventHandler');
    redrawEventHandler.appendChildEventHandler(propagationRedrawEventHandler);

    // Texture Stub for loading Background textures.
    var backgroundTextureNode, textureStub, textureStubdgnode;
    textureStub = scene.constructEventHandlerNode(options.name + '_backgroundTextureStub');
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
        srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/viewPortUpdateRayCast.kl',
        entryFunctionName: 'viewPortUpdateRayCast',
        parameterBinding: [
          'camera.cameraMat44',
          'camera.projectionMat44',
          'window.width',
          'window.height',
          'self.x',
          'self.y',
          'self.ray'
        ]
      }));

      viewPortRaycastEventHandler = scene.constructEventHandlerNode('Viewport_raycast');
      viewPortRaycastEventHandler.addScope('raycastData', viewPortRayCastDgNode);

      // Raycast events are fired from the viewport. As the event
      // propagates down the tree it collects scopes and fires operators.
      // The operators us the collected scopes to calculate the ray.
      viewPortRaycastEvent = scene.constructEventNode('Viewport_raycastEvent');
      viewPortRaycastEvent.appendEventHandler(viewPortRaycastEventHandler);

      // the sceneRaycastEventHandler propogates the event throughtout the scene.
      viewPortRaycastEventHandler.appendChildEventHandler(scene.getSceneRaycastEventHandler());


      viewPortRayCastDgNode.addDependency(fabricwindow.windowNode, 'window');
    }

    var getElementCoords = function(evt) {
      if (evt.offsetX) {
        return FABRIC.RT.vec2(evt.offsetX, evt.offsetY);
      }
      else if (evt.layerX) {
        return FABRIC.RT.vec2(evt.layerX, evt.layerY);
      }
    }

    // private interface
    viewportNode.getRedrawEventHandler = function() {
      return redrawEventHandler;
    };
    viewportNode.getRaycastEventHandler = function() {
      return viewPortRaycastEventHandler;
    };
    viewportNode.getWindowElement = function() {
      return windowElement;
    };
    viewportNode.getWindow = function() {
      return fabricwindow;
    };

    // public interface
    scene.addMemberInterface(viewportNode, dgnode, 'backgroundColor', true);
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
        textureStub.setBindingName('textureStub');
        textureStub.addMember('textureUnit', 'Integer', 0);
        textureStub.addMember('program', 'Integer', 0);
        textureStub.postDescendBindings.append(
          scene.constructOperator({
              operatorName: 'renderTextureToView',
              srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/OffscreenRendering.kl',
              entryFunctionName: 'renderTextureToView',
              parameterBinding: [
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
      var parentEventHandler;
      postProcessEffects.splice(filterIndex, 1);
      postProcessEffect.getRedrawEventHandler().removeChildEventHandler(
        filterIndex < postProcessEffects.length ? postProcessEffects[filterIndex] : propagationRedrawEventHandler);

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
    viewportNode.pub.redraw = function() {
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
            // TODO: Log a bug. We should be getting the pub interfae here
            // from the 'closestNode' from the ;werapper layer.
            var hitNode = raycastResult.closestNode.node.pub.sceneGraphNode;
            evt.rayData = raycastResult.rayData;
            evt.hitData = raycastResult.closestNode.value;
            if (mouseOverNode == undefined ||
                mouseOverNode.name !== hitNode.name ||
                mouseOverNodeData.sliceid !== evt.hitData.sliceid) {
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
        if (options.redrawOnMouseMove && propagateEvent) {
        //  viewportNode.redraw();
        }
      };

      var mouseDownFn = function(evt) {
        propagateEvent = true;
        if (cameraNode && viewPortRayCastDgNode) {
          var raycastResult = viewportNode.pub.rayCast(evt);
          if (raycastResult.closestNode) {
            var hitNode = raycastResult.closestNode.node.pub.sceneGraphNode;
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
            var hitNode = raycastResult.closestNode.node.pub.sceneGraphNode;
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
      var activateMousewheelFn = function(evt) {
        var mousewheelFn = function(evt) {
          fireEvent('mousewheel', evt);
        }
        document.addEventListener('mousewheel', mousewheelFn, false);
        var deactivateMousewheelFn = function(evt) {
          windowElement.removeEventListener('mouseout', deactivateMousewheelFn, false);
          document.removeEventListener('mousewheel', mousewheelFn, false);
        }
        windowElement.addEventListener('mouseout', deactivateMousewheelFn, false);
      }
      windowElement.addEventListener('mouseover', activateMousewheelFn, false);

      scene.addEventHandlingFunctions(viewportNode);
    }

    if (options.cameraNode) {
      viewportNode.pub.setCameraNode(options.cameraNode);
    }

    return viewportNode;
  });


FABRIC.SceneGraph.registerNodeType('Camera',
  function(options, scene) {

    scene.assignDefaults(options, {
        nearDistance: 5,
        farDistance: 1000,
        fovY: 60,
        focalDistance: 160,
        orthographic: false,
        transformNode: 'Transform'
      });
    options.dgnodenames.push('DGNode');

    var transformNode;
    var transformNodeMember = 'globalXfo';
    var cameraNode = scene.constructNode('SceneGraphNode', options);
    var dgnode = cameraNode.getDGNode();
    dgnode.addMember('nearDistance', 'Scalar', options.nearDistance);
    dgnode.addMember('farDistance', 'Scalar', options.farDistance);
    dgnode.addMember('fovY', 'Scalar', options.fovY * FABRIC.RT.degToRad);
    dgnode.addMember('focalDistance', 'Scalar', options.focalDistance);
    dgnode.addMember('cameraMat44', 'Mat44');
    dgnode.addMember('orthographic', 'Boolean', options.orthographic);
    dgnode.addMember('projectionMat44', 'Mat44');

    var redrawEventHandler = scene.constructEventHandlerNode(options.name + '_RedrawEventHandler');
    redrawEventHandler.addScope('camera', dgnode);

    redrawEventHandler.preDescendBindings.append(scene.constructOperator({
      operatorName: 'UpdateCameraProjection',
      srcFile: 'FABRIC_ROOT/SceneGraph/Resources/KL/updateCameraProjection.kl',
      entryFunctionName: 'updateCameraProjection',
      parameterBinding: [
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

    // private interface
    cameraNode.getRedrawEventHandler = function() {
      return redrawEventHandler;
    };

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
        srcCode: 'operator loadXfo(io Xfo xfo, io Mat44 mat44){ mat44 = xfo; mat44 = mat44.inverse(); }',
        entryFunctionName: 'loadXfo',
        parameterBinding: [
          'transform.' + transformNodeMember,
          'self.cameraMat44'
        ]
      }));
    };
    scene.addMemberInterface(cameraNode, dgnode, 'cameraMat44');
    scene.addMemberInterface(cameraNode, dgnode, 'projectionMat44');
    scene.addMemberInterface(cameraNode, dgnode, 'nearDistance', true);
    scene.addMemberInterface(cameraNode, dgnode, 'farDistance', true);
    scene.addMemberInterface(cameraNode, dgnode, 'fovY', true);
    scene.addMemberInterface(cameraNode, dgnode, 'focalDistance', true);

    scene.addEventHandlingFunctions(cameraNode);

    if (typeof options.transformNode == 'string') {
      cameraNode.pub.setTransformNode(scene.constructNode(options.transformNode, { hierarchical: false }).pub);
    }else {
      cameraNode.pub.setTransformNode(options.transformNode);
    }
    return cameraNode;
  });



FABRIC.SceneGraph.registerNodeType('FreeCamera',
  function(options, scene) {
    scene.assignDefaults(options, {
        position: FABRIC.RT.vec3(1, 0, 0),
        orientation: FABRIC.RT.quat()
      });

    options.transformNode = scene.constructNode('Transform', {
      globalXfo: FABRIC.RT.xfo({ tr: options.position, ori: options.orientation })
    });

    var freeCameraNode = scene.constructNode('Camera', options);

    // extend public interface
    scene.addMemberInterface(freeCameraNode, freeCameraNode.getDGNode(), 'globalXfo', true);

    return freeCameraNode;
  });



FABRIC.SceneGraph.registerNodeType('TargetCamera',
  function(options, scene) {
    scene.assignDefaults(options, {
        position: FABRIC.RT.vec3(1, 0, 0),
        target: FABRIC.RT.vec3(0, 0, 0),
        roll: 0.0
      });

    var transformNodeOptions = {
      position: options.position,
      target: options.target,
      roll: options.roll
    };
    var dirVec = options.target.subtract(options.position);
    dirVec.y = 0;
    dirVec.setUnit();
    var angle = dirVec.getAngleTo(FABRIC.RT.vec3(0, 0, -1));
    transformNodeOptions.globalXfo = new FABRIC.RT.xfo({
      tr: options.position,
      ori: FABRIC.RT.Quat.makeFromAxisAndAngle(FABRIC.RT.vec3(0, 1, 0), angle)
    });
    options.transformNode = scene.pub.constructNode('AimTransform', transformNodeOptions);

    var targetCameraNode = scene.constructNode('Camera', options);

    // extend public interface
    targetCameraNode.pub.__defineGetter__('position', function() {
      freeCameraNode.pub.getTransformNode().globalXfo.tr;
    });
    targetCameraNode.pub.__defineSetter__('position', function(val) {
      if (!val.getType || val.getType() !== 'FABRIC.RT.Vec3') {
        throw ('Incorrect type assignment. Must assign a FABRIC.RT.Vec3');
      }
      var xfo = targetCameraNode.pub.getTransformNode().globalXfo;
      xfo.tr = val;
      targetCameraNode.pub.getTransformNode().globalXfo = xfo;
    });
    targetCameraNode.pub.__defineGetter__('target', function() {
      return targetCameraNode.pub.getTransformNode().target;
    });
    targetCameraNode.pub.__defineSetter__('target', function(val) {
      targetCameraNode.pub.getTransformNode().target = val;
    });

    targetCameraNode.getDGNode().bindings.append(scene.constructOperator({
      operatorName: 'loadFocalDist',
      srcCode: 'operator loadFocalDist(io Xfo xfo, io Vec3 target, io Scalar focalDist)' +
      '{' +
      '  focalDist = xfo.tr.dist(target);' +
      '}',
      entryFunctionName: 'loadFocalDist',
      parameterBinding: [
        'transform.globalXfo',
        'transform.target',
        'self.focalDistance'
      ]
    }));

    return targetCameraNode;
  });


