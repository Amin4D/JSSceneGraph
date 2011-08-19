
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//

FABRIC = (function() {
  
  var BrowserDetect = {
    init: function () {
      this.browser = this.searchString(this.dataBrowser) || "An unknown browser";
      this.version = this.searchVersion(navigator.userAgent)
        || this.searchVersion(navigator.appVersion)
        || "an unknown version";
      this.OS = this.searchString(this.dataOS) || "an unknown OS";
    },
    searchString: function (data) {
      for (var i=0;i<data.length;i++)	{
        var dataString = data[i].string;
        var dataProp = data[i].prop;
        this.versionSearchString = data[i].versionSearch || data[i].identity;
        if (dataString) {
          if (dataString.indexOf(data[i].subString) != -1)
            return data[i].identity;
        }
        else if (dataProp)
          return data[i].identity;
      }
      return "";
    },
    searchVersion: function (dataString) {
      var index = dataString.indexOf(this.versionSearchString);
      if (index == -1) return -1;
      return parseFloat(dataString.substring(index+this.versionSearchString.length+1));
    },
    dataBrowser: [
      {
        string: navigator.userAgent,
        subString: "Chrome",
        identity: "Chrome"
      },
      { string: navigator.userAgent,
        subString: "OmniWeb",
        versionSearch: "OmniWeb/",
        identity: "OmniWeb"
      },
      {
        string: navigator.vendor,
        subString: "Apple",
        identity: "Safari",
        versionSearch: "Version"
      },
      {
        prop: window.opera,
        identity: "Opera",
        versionSearch: "Version"
      },
      {
        string: navigator.vendor,
        subString: "iCab",
        identity: "iCab"
      },
      {
        string: navigator.vendor,
        subString: "KDE",
        identity: "Konqueror"
      },
      {
        string: navigator.userAgent,
        subString: "Firefox",
        identity: "Firefox"
      },
      {
        string: navigator.vendor,
        subString: "Camino",
        identity: "Camino"
      },
      { // for newer Netscapes (6+)
        string: navigator.userAgent,
        subString: "Netscape",
        identity: "Netscape"
      },
      {
        string: navigator.userAgent,
        subString: "MSIE",
        identity: "Explorer",
        versionSearch: "MSIE"
      },
      {
        string: navigator.userAgent,
        subString: "Gecko",
        identity: "Mozilla",
        versionSearch: "rv"
      },
      { // for older Netscapes (4-)
        string: navigator.userAgent,
        subString: "Mozilla",
        identity: "Netscape",
        versionSearch: "Mozilla"
      }
    ],
    dataOS : [
      {
        string: navigator.platform,
        subString: "Win",
        identity: "Windows"
      },
      {
        string: navigator.platform,
        subString: "Mac",
        identity: "Mac"
      },
      {
           string: navigator.userAgent,
           subString: "iPhone",
           identity: "iPhone/iPod"
      },
      {
        string: navigator.platform,
        subString: "Linux",
        identity: "Linux"
      }
    ]
  
  };
  BrowserDetect.init();

  // we keep an array of context ids,
  // so we can open the debugger with one
  var contextIDs = [];
  
  var createDownloadPrompt = function( div ){
    var os, arch, ext;
    switch(BrowserDetect.OS){
      case "Mac":
        os = "Darwin";
        if(navigator.platform == "MacIntel")
             arch = "i386";
        else arch = "x86_64";
        break;
      case "Windows":
        os = "Windows";
        arch = "x86";
        break;
      case "Linux":
        os = "Linux";
        throw("Helge: Fix me...");
        if(navigator.platform == "x86")
             arch = "x86";
        else arch = "x86_64";
        break;
      default:
        alert("Unsupported Operating system");
        throw("Unsupported Operating system");
    }
    switch(BrowserDetect.browser){
      case "Chrome": ext = "crx"; break;
      case "Firefox": ext = "xpi"; break;
      default:
        alert("Unsupported Browser");
        throw("Unsupported Browser");
    }
    var pluginInstallUrl = "http://dist.fabric-engine.com/latest/FabricEngine-"+os+"-"+arch+"."+ext;
  //  window.open(pluginInstallUrl,'Download');
    window.location = pluginInstallUrl;
  }

  var createContext = function(options) {
    
    // Check to see if the plugin is loaded.
    if(!navigator.mimeTypes["application/fabric"]){
      createDownloadPrompt();
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
    
    var context = wrapFabricClient(embedTag, function(s) { console.log(s); } );
    
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
      embedTag.setAttributeNS(null, 'width', element.offsetWidth);
      embedTag.setAttributeNS(null, 'height', element.offsetHeight);
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
      onDOMWindowResize();
      window.addEventListener('resize', onDOMWindowResize, false);

      var result = {
        RT: context.RT,
        RegisteredTypesManager: context.RT,
        DG: context.DG,
        DependencyGraph: context.DG,
        getContextID: function() {
          return context.getContextID();
        },
        getLicenses: function() {
          return context.getLicenses();
        },
        domElement: embedTag,
        windowNode: context.VP.viewPort.getWindowNode(),
        redrawEvent: context.VP.viewPort.getRedrawEvent(),
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
      result.__defineGetter__('fps', function() {
        return context.VP.viewPort.getFPS();
      });
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
  
  var asyncTaskCount = 0;
  
  var addAsyncTask = function(callback){
    asyncTaskCount++;
    setTimeout(function(){
      callback();
      asyncTaskCount--;
      fireOnResolveAsyncTaskCallbacks('...');
    }, 1);
  }
  
  var onResolveAsyncTaskCallbacks = [];
  var appendOnResolveAsyncTaskCallback = function(fn) {
    onResolveAsyncTaskCallbacks.push(fn);
  };
  var fireOnResolveAsyncTaskCallbacks = function(label){
    for (i=0; i<onResolveAsyncTaskCallbacks.length; i++){
      if(onResolveAsyncTaskCallbacks[i].call(undefined, label, asyncTaskCount)){
        onResolveAsyncTaskCallbacks.splice(i, 1);
        i--;
      }
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
    
    var label = url.split('/').pop().split('.')[0];
    var async = (FABRIC.asyncResourceLoading && callback!==undefined) ? true : false;
    if(async){
      asyncTaskCount++;
    }
    var result = null;
    var xhreq = new XMLHttpRequest();
    xhreq.onreadystatechange = function() {
      if (xhreq.readyState == 4) {
        if (xhreq.status == 200) {
          if(callback){
            callback(xhreq.responseText);
            asyncTaskCount--;
            fireOnResolveAsyncTaskCallbacks(label);
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
    addAsyncTask: addAsyncTask,
    getAsyncTaskCount: function(){ return asyncTaskCount; },
    appendOnResolveAsyncTaskCallback: appendOnResolveAsyncTaskCallback,
    convertImageURLToDataURL: convertImageURLToDataURL
  };
})();
