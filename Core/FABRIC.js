
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//

FABRIC = (function() {

  // we keep an array of context ids,
  // so we can open the debugger with one
  var contextIDs = [];
  var bindContextToEmbedTag = function(embedTag) {
    var result = wrapFabricClient(embedTag, function(s) { console.log(s); } /*, function(s){console.debug(s);}*/);

    result.addPopUpItem = function(desc, callback, arg) {
      //embedTag.addPopUpItem(desc, callback, arg);
    };
    /*
    {
      contextID: embedTag.contextID,
      jsonExec: function (jsonEncodedCommands) {
        return embedTag.jsonExec(jsonEncodedCommands);
      },
      setJSONNotifyCallback: function (jsonNotifyCallback) {
        embedTag.setJSONNotifyCallback(jsonNotifyCallback);
      },
      RegisteredTypesManager: embedTag.RegisteredTypesManager,
      DependencyGraph: embedTag.DependencyGraph,
      DG: embedTag.DependencyGraph,
      FrontEnds: embedTag.FrontEnds,
      IO: embedTag.IO,
      ThirdParty: embedTag.ThirdParty,
                        Plugins: embedTag.Plugins,
    };
    */

    return result;
  };

  var createContext = function(options) {
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

    var context = bindContextToEmbedTag(embedTag);
    
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
        // the path to the Fabric SDK.
      url = url.split('/').splice(1).join('/');
      var urlSections = document.location.href.split('/');
      do {
        urlSections.pop();
      }while (urlSections[urlSections.length - 1].toLowerCase() !== 'fabric') {
        if (!urlSections.length) {
          throw ('Invalid document URL: ' + document.location.href + ". Missing 'Fabric' in the path.");
        }
      }
      url = urlSections.join('/') + '/' + url;
    }
    return url;
  };

  var loadResourceURL = function(url, mimeType) {
    if (!url) {
      throw 'missing URL';
    }

    url = processURL(url);

    var result = null;
    var xhreq = new XMLHttpRequest();
    xhreq.onreadystatechange = function() {
      if (xhreq.readyState == 4) {
        if (xhreq.status == 200) {
          result = xhreq.responseText;
        }
      }
    };
    xhreq.open('GET', url, false);
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
    convertImageURLToDataURL: convertImageURLToDataURL
  };
})();
