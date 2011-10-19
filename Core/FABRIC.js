
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//

FABRIC = (function() {

  // we keep an array of context ids,
  // so we can open the debugger with one
  var contextIDs = [];
  
  var displayPluginInstallPage = function( div ){
    var iframeTag = document.createElement('iframe');
    iframeTag.setAttributeNS(null, 'src', 'http://demos.fabric-engine.com/Fabric/Core/pluginInstall.html');
    iframeTag.setAttributeNS(null, 'style', 'position:absolute; left:10px; right:10px; top:10px; bottom:10px; z-index:10');
    iframeTag.setAttributeNS(null, 'width', '98%');
    iframeTag.setAttributeNS(null, 'height', '98%');
    document.body.appendChild(iframeTag);
    window.downloadAndInstallPlugin = function(url, message){
      // Remove the iframe, and display the message.
      document.body.removeChild(iframeTag);
      window.location = url;
      alert(message);
    }
  }

  var createContext = function(options) {
    
    // Check to see if the plugin is loaded.
    if(!navigator.mimeTypes["application/fabric"]){
      displayPluginInstallPage();
      throw("Fabric not installed");
    }else if(!navigator.mimeTypes["application/fabric"].enabledPlugin){
      alert("Fabric plugin not enabled");
      throw("Fabric plugin not enabled");
    }
    
    
    if (!options)
      options = {};

    var contextID = '';
    if (options.contextID)
      contextID = options.contextID;

    var embedTag = document.createElement('embed');
    embedTag.setAttributeNS(null, 'type', 'application/fabric');
    embedTag.setAttributeNS(null, 'width', 0);
    embedTag.setAttributeNS(null, 'height', 0);
    embedTag.setAttributeNS(null, 'windowType', 'empty');
    embedTag.setAttributeNS(null, 'contextID', contextID);
    // [pzion 20110208] This is really stupid.  We should really hide this, but
    // if you do so then Chrome disables the plugin.
    //embedTag.style.display = 'none';
    document.body.appendChild(embedTag);
    
    var context = embedTag.wrapFabricClient(embedTag, function(s) { console.log(s); } );

    //Enable math warnings (comment out this line if you don't want them)
    Math.verboseLogFunction = function(s){console.log(s);};
    
    ///////////////////////////////////////////////////////////
    // Check the currently installed version.
    // TODO: This code will be removed once we get to the end of beta.
    var version = context.build.getPureVersion().split('.');
    var requiredVersion = [1,0,14];
    var cmpVersions = function (lhs, rhs) {
      if (lhs[0] < rhs[0])
        return -1;
      else if (lhs[0] == rhs[0]) {
        if (lhs[1] < rhs[1])
          return -1;
        else if (lhs[1] == rhs[1]) {
          if (lhs[2] < rhs[2])
            return -1;
          else if (lhs[2] == rhs[2])
            return 0;
          else return 1;
        }
        else return 1;
      }
      else return 1;
    };
    var outOfDateMessage =
      "The version of Fabric that you have installed is out of date.\n" +
      "Please install the updated plugin";
    if (cmpVersions(version, requiredVersion) < 0) {
      alert(outOfDateMessage);
      displayPluginInstallPage();
      throw(outOfDateMessage);
    }
    
    if(context.build.isExpired()){
      var expiredMessage = "Fabric(Alpha) plugin has expired. Please install the lastest version";
      alert(expiredMessage);
      displayPluginInstallPage();
      throw(expiredMessage);
    }
    
    FABRIC.displayDebugger = function(ctx) {
      if(!ctx) ctx = context;
      var debuggerWindow = window.open(
          FABRIC.processURL('FABRIC_ROOT/Core/Debugger/debugger.html') +
          '?id=' + context.getContextID() +
          '?title=' + document.title.replace(/[^a-zA-Z\t0-9]+/g,''),
          'Fabric Debugger',
          'status=1,resizable=1,width=1000,height=600'
        );
      debuggerWindow.context = context;
    };
    
    FABRIC.flush = function() {
      context.flush();
    };
    
    if(!contextID){
      // only fire the callbacks if a new context is being created.
      for (var i = 0; i < onCreateContextCallbacks.length; ++i)
        onCreateContextCallbacks[i](context);
    }
    contextIDs.push(context.getContextID());

    context.createWindow = function(element, options) {
      if (!options)
        options = {};

      var embedTag = document.createElement('embed');
      embedTag.setAttributeNS(null, 'type', 'application/fabric');
      embedTag.setAttributeNS(null, 'width', 1);
      embedTag.setAttributeNS(null, 'height', 1);
      embedTag.setAttributeNS(null, 'windowType', '3d');
      embedTag.setAttributeNS(null, 'contextID', this.getContextID());

      if (options.windowType)
        embedTag.setAttributeNS(null, 'viewPortType', options.windowType);
      if (options.windowType == 'empty') {
        // [pzion 20110208] This is really stupid.  We should really hide this, but
        // if you do so then Chrome disables the plugin.
        //embedTag.style.display = 'none';
      }
      element.appendChild(embedTag);

      var onDOMWindowResize = function() {
        if (options.aspectRatio) {
          embedTag.width = element.offsetWidth;
          embedTag.height = element.offsetWidth * options.aspectRatio;
        } else {
          embedTag.width = element.offsetWidth;
          embedTag.height = element.offsetHeight;
        }
      };
      embedTag.width = 1;
      embedTag.height = 1;
      
      var result = {
        RT: context.RT,
        RegisteredTypesManager: context.RT,
        DG: context.DG,
        DependencyGraph: context.DG,
        IO: context.IO,
        getContextID: function() {
          return context.getContextID();
        },
        getLicenses: function() {
          return context.getLicenses();
        },
        domElement: embedTag,
        windowNode: context.VP.viewPort.getWindowNode(),
        redrawEvent: context.VP.viewPort.getRedrawEvent(),
        hide: function(){
          embedTag.width = 1;
          embedTag.height = 1;
          // the element will get resized to the correct size
          // by the client (Viewport) when it is ready
          window.removeEventListener('resize', onDOMWindowResize, false);
        },
        show: function(){
          onDOMWindowResize();
          // the element will get resized to the correct size
          // by the client (Viewport) when it is ready
          window.addEventListener('resize', onDOMWindowResize, false);
        },
        needsRedraw: function() {
          context.VP.viewPort.needsRedraw();
        },
        setRedrawFinishedCallback: function(callback) {
          context.VP.viewPort.setRedrawFinishedCallback(function() {
            if (callback)
              callback();
          });
        },
        addPopUpMenuItem: function(name, desc, callback) {
          context.VP.viewPort.addPopUpMenuItem(name, desc, callback);
        }
      };

  
      var queryDGNode;
      var openGLVersion = undefined;
      var glewSupported = {};
      var constructGLEWQueryNode = function(){
        // create the query nodes
        queryDGNode = context.DG.createNode('OpenGLQuery');
        queryDGNode.addMember('version', 'String', '');
        queryDGNode.addMember('token', 'String', '');
        queryDGNode.addMember('supported', 'Boolean', false);
        queryDGNode.setDependency(result.windowNode,'window');
        
        // operator to query the open gl version
        var queryOpVersion = context.DG.createOperator('getOpenGLVersion');
        queryOpVersion.setEntryFunctionName('getOpenGLVersion');
        queryOpVersion.setSourceCode('use FabricOGL; operator getOpenGLVersion(io String version){\n' +
          '  glGetVersion(version);\n' +
          '}');
        var queryOpVersionBinding = context.DG.createBinding();
        queryOpVersionBinding.setOperator(queryOpVersion);
        queryOpVersionBinding.setParameterLayout(['self.version']);
        queryDGNode.bindings.append(queryOpVersionBinding);
        
        // operator to query the support glew features
        var queryOpGlew = context.DG.createOperator('getGlewSupported');
        queryOpGlew.setEntryFunctionName('getGlewSupported');
        queryOpGlew.setSourceCode('use FabricOGL; operator getGlewSupported(io String token, io Boolean supported){\n' +
          '  if(token.length() > 0) glewIsSupported(token,supported);\n' +
          '}');
        var queryOpGlewBinding = context.DG.createBinding();
        queryOpGlewBinding.setOperator(queryOpGlew);
        queryOpGlewBinding.setParameterLayout(['self.token','self.supported']);
        queryDGNode.bindings.append(queryOpGlewBinding);
      }
      
      result.getOpenGLVersion = function() {
        if(!queryDGNode){
          constructGLEWQueryNode();
        }
        // if we already know it, skip it
        if( openGLVersion == undefined) {
          // force an eval
          queryDGNode.evaluate();
          openGLVersion = queryDGNode.getData('version',0);
        }
        return openGLVersion;
      }
      result.getGlewSupported = function(token) {
        if(!queryDGNode){
          constructGLEWQueryNode();
        }
        // if we already know it, skip it
        if( glewSupported[token] == undefined) {
          // force an eval
          queryDGNode.setData('token',0,token);
          queryDGNode.evaluate();
          glewSupported[token] = queryDGNode.getData('supported',0);
        }
        return glewSupported[token];
      }
    
      return result;
    };
    
    
    return context;
  };

  var onCreateContextCallbacks = [];

  var appendOnCreateContextCallback = function(callback) {
    onCreateContextCallbacks.push(callback);
  };
  
  
  var processURL = function(url) {
    if (url.split('/')[0] === 'FABRIC_ROOT') {
      // Remove the "FABRIC_ROOT" and replace it with
      // the path to the Fabric SDK. If the loaded HTML
      // file under the Fabric URL, then it can locate
      // it automaticaly. Otherwize it must be specified. 
      url = url.split('/').splice(1).join('/');
      var urlSections = document.location.href.split('/');
      do {
        urlSections.pop();
      }while (urlSections.length > 0 &&
              urlSections[urlSections.length - 1].toLowerCase() !== 'fabric');
      
      if (urlSections.length == 0) {
        if( FABRIC.fabricSDKPath ){
          return FABRIC.fabricSDKPath + '/' + url;
        }else{
          throw ('Fabric SDK Path not provided. \n\
                 specify the location of the Fabric SDK by setting FABRIC.fabricSDKPath prior to constr');
        }
      }
      return urlSections.join('/') + '/' + url;
    }
    return url;
  };

  var activeAsyncTaskCount = 0;
  var asyncTasksWeight = 0.0;
  var asyncTasksMaxWeight = 0.0;
  
  var onResolveAsyncTaskCallbacks = [];
  var appendOnResolveAsyncTaskCallback = function(fn) {
    onResolveAsyncTaskCallbacks.push(fn);
  };
  var fireOnResolveAsyncTaskCallbacks = function(label){
    for (var i=0; i<onResolveAsyncTaskCallbacks.length; i++){
      if (onResolveAsyncTaskCallbacks[i].call(undefined, label, activeAsyncTaskCount, asyncTasksWeight, asyncTasksMaxWeight)) {
        onResolveAsyncTaskCallbacks.splice(i, 1);
        i--;
      }
    }
  }
  
  // Some tasks can be defined to run asynchronously as part of the load
  // stage where operators are compiled. This enables delaying of complex tasks,
  // that would block the drawing to the page till after the first redraw.
  var createAsyncTask = function(callback, weight) {
    activeAsyncTaskCount++;
    if (weight === undefined)
      weight = 1.0;
    asyncTasksWeight += weight;
    asyncTasksMaxWeight += weight;
    setTimeout(function(){
      activeAsyncTaskCount--;
      callback();
      asyncTasksWeight -= weight;
      fireOnResolveAsyncTaskCallbacks('...');
    }, 1);
  }
  // Tasks can be registered that contribute to the async workload. E.g. resource
  // loading can be defined to contribute to the intitial loading of the graph. 
  var addAsyncTask = function(label, weight) {
    activeAsyncTaskCount++;
    if (!weight)
      weight = 1.0;
    asyncTasksWeight += weight;
    asyncTasksMaxWeight += weight;
    return function(finished, deltaWeight) {
      if (finished === undefined)
        finished = true;
      if (finished)
        activeAsyncTaskCount--;
      if (deltaWeight === undefined)
        deltaWeight = -weight;
      asyncTasksWeight += deltaWeight;
      if (deltaWeight > 0)
        asyncTasksMaxWeight += deltaWeight;
      fireOnResolveAsyncTaskCallbacks(label);
    }
  }
  var loadResourceURL = function(url, mimeType, callback) {
    if (!url) {
      throw 'missing URL';
    }
    
    if(document.location.href.split('/')[0] === 'file:'){
      alert('Fabric demos must be loaded from localhost.\nNot directly from the file system.\n\ne.g. "http://localhost/Fabric/Apps/Sample/BasicDemos/Flocking.html"');
      thorow('Fabric demos must be loaded from localhost.\nNot directly from the file system.\n\ne.g. "http://localhost/Fabric/Apps/Sample/BasicDemos/Flocking.html"');
    }
    url = processURL(url);
    
    var async = (FABRIC.asyncResourceLoading && callback!==undefined) ? true : false;
    var onAsyncFinishedCallback;
    if(async){
      var label = url.split('/').pop().split('.')[0];
      onAsyncFinishedCallback = addAsyncTask(label);
    }
    var result = null;
    var xhreq = new XMLHttpRequest();
    xhreq.onreadystatechange = function() {
      if (xhreq.readyState == 4) {
        if (xhreq.status == 200) {
          if(callback){
            callback(xhreq.responseText);
            onAsyncFinishedCallback();
          }
          else{
            result = xhreq.responseText;
          }
        }
      }
    };
    xhreq.open('GET', url, async);
    xhreq.overrideMimeType(mimeType ? mimeType : 'text/plain');
    xhreq.send(null);
    return result;
  };

  var convertImageURLToDataURL = function(imageURL, callback, mimeType) {
    if (mimeType === undefined) {
      mimeType = 'image/png';
    }
    var img = new Image;
    img.onload = function() {
      var canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;

      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      callback(canvas.toDataURL(mimeType));
    };
    img.src = imageURL;
  };

  var isObjectEmpty = function(o) {
    for (var i in o)
      return false;
    return true;
  };

  return {
    createContext: createContext,
    getContextIDs: function() { return contextIDs; },
    appendOnCreateContextCallback: appendOnCreateContextCallback,
    processURL: processURL,
    loadResourceURL: loadResourceURL,
    asyncResourceLoading: true,
    createAsyncTask: createAsyncTask,
    addAsyncTask: addAsyncTask,
    getActiveAsyncTaskCount: function() { return activeAsyncTaskCount; },
    getAsyncTasksWeight: function() { return asyncTasksWeight; },
    getAsyncTasksMaxWeight: function() { return asyncTasksMaxWeight; },
    appendOnResolveAsyncTaskCallback: appendOnResolveAsyncTaskCallback,
    convertImageURLToDataURL: convertImageURLToDataURL
  };
})();
