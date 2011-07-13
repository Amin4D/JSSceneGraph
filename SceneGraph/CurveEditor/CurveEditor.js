
var constructCurveEditor = function(domRootID, keyframeTrackNode, options){
  
  options = options ? options : {};
  options.timeStripe = options.timeStripe ? options.timeStripe : true;
  options.draggable = options.draggable ? options.draggable : true;
  options.zoomable = options.zoomable ? options.zoomable : true;
  
  var rootDomNode = document.getElementById(domRootID);
  var windowWidth = rootDomNode.clientWidth;
  var windowHeight = rootDomNode.clientHeight;
  
  var svgRoot = FABRIC.createSVGRootElem(domRootID);

  var graphBGRect = svgRoot.createRect().size(windowWidth, windowHeight).addClass('EventCatcher');
  var graphCenterGroup = svgRoot.createGroup().id('graphCenterGroup').translate(0, windowHeight * 0.5);
  var curvesHolderGroup = graphCenterGroup.createGroup().id('curvesHolderGroup')
  var keysHolderGroup = graphCenterGroup.createGroup().id('keysHolderGroup');
  svgRoot.svgRoot = svgRoot;
  svgRoot.state = 'Normal';
  
  ///////////////
  var trackDisplayNodes = [];
  var trackCount = keyframeTrackNode.getTrackCount();
  var timeRange = FABRIC.vec2(0, 0);
  var yRange = FABRIC.vec2(0, 0);
  var curvesData = [];
  var trackCurves = [];
  for (var i = 0; i < trackCount; i++) {
    var trackData = keyframeTrackNode.getTrackData(i);
    $('#keyframeTracks').append('<div style="margin-top:10px;">' + trackData.name + '</div>');
    trackCurves[i] = curvesHolderGroup.createPath().addClass('CurvePath').stroke(trackData.color);
    trackDisplayNodes[i] = scene.constructNode('TrackDisplay', {
      animationTrackNode: keyframeTrackNode,
      trackIndex: i
    });
  }
  


  var screenXfo = {
    tr: FABRIC.vec2(0, 0),
    sc: FABRIC.vec2(1, 1),
    fitToScreen:function(){
      for (var i = 0; i < trackCount; i++) {
        var keys = keyframeTrackNode.getTrackKeys(i);
        if (timeRange.x > keys[0].time) {
          timeRange.x = keys[0].time;
        }
        if (timeRange.y < keys[keys.length - 1].time) {
          timeRange.y = keys[keys.length - 1].time;
        }
      }
      var getCurveYRange = function(curveData) {
        for (var i = 1; i < curveData.time.length; i++) {
          if (yRange.x > curveData.value[i]) {
            yRange.x = curveData.value[i];
          }
          if (yRange.y < curveData.value[i]) {
            yRange.y = curveData.value[i];
          }
        }
      }
      for (var i = 0; i < trackCount; i++) {
        trackDisplayNodes[i].setTimeRange(timeRange);
        curvesData[i] = trackDisplayNodes[i].getCurveData();
        if(i==0){
          yRange = FABRIC.vec2(curvesData[0].value[0], curvesData[0].value[0]);
        }
        getCurveYRange(curvesData[i]);
      }
      this.sc = FABRIC.vec2(windowWidth/(timeRange.y - timeRange.x), -(windowHeight - 40) / (yRange.y - yRange.x));
      this.tr = FABRIC.vec2(-timeRange.x, (yRange.y + yRange.x) * -0.5);
    },
    update: function(){
      this.sc.x = windowWidth / (timeRange.y - timeRange.x);
    },
    toScreenSpace: function(val, local){
      if(local){
        return val.multiply(this.sc);
      }else{
        return val.add(this.tr).multiply(this.sc);
      }
    },
    toGraphSpace: function(val, local){
      if(local){
        return val.multiply(this.sc.invert());
      }else{
        return val.multiply(this.sc.invert()).subtract(this.tr);
      }
    }
  }
  screenXfo.fitToScreen();
  
  var drawTrackCurves = function(){
    var drawTrackCurve = function(trackIndex) {
      var setPathCurveValues = function(curveData) {
        var val = screenXfo.toScreenSpace(FABRIC.vec2(curveData.time[0], curveData.value[0]))
        var path = ['M', val.x, val.y, 'L', 100, 100, 300, 200];
        for (var i = 0; i < curveData.time.length; i++) {
          val = screenXfo.toScreenSpace(FABRIC.vec2(curveData.time[i], curveData.value[i]))
          path[(i * 2) + 4] = val.x;
          path[(i * 2) + 5] = val.y;
        }
        trackCurves[trackIndex].attr('d', path.join(' '));
      }
      setPathCurveValues(curvesData[trackIndex]);
  
      var updateCurve = function() {
        curvesData[trackIndex] = trackDisplayNodes[trackIndex].getCurveData();
        setPathCurveValues(curvesData[trackIndex]);
      }
  
      var drawKey = function(keyIndex, keyData) {
        if((keyData.time + keyData.intangent.x) < timeRange.y &&
           (keyData.time + keyData.outtangent.x) > timeRange.x ){
          ///////////////////////////////////////////////
          // Key
          var keySsVal = screenXfo.toScreenSpace(FABRIC.vec2(keyData.time, keyData.value));
          // When keyframes are manipulated, we can maintain the tangent lengths
          // by storing the relative lengths, and gradients. Then, during manipulation
          // we maintain these relative lengths and gradients. This simplifies the
          // keyframes, by moving the complexity into the manipulation system.
          var prevKey, nextKey, tangentNormalizedValues = [];
          var keyGroupNode = keysHolderGroup.createGroup().translate(keySsVal)
            .draggable({ mouseButton: 0 })
            .addOnDragBeginCallback(
              function(evt){
                var deltat, i=0;
                if(keyIndex>0){
                  prevKey = trackData.keys[keyIndex-1];
                  deltat = keyData.time - prevKey.time;
                  tangentNormalizedValues[i++] = prevKey.outtangent.x / deltat;
                  tangentNormalizedValues[i++] = prevKey.outtangent.y / prevKey.outtangent.x;
                  tangentNormalizedValues[i++] = keyData.intangent.x / deltat;
                  tangentNormalizedValues[i++] = keyData.intangent.y / keyData.intangent.x;
                }
                if(keyIndex<trackData.keys.length-1){
                  nextKey = trackData.keys[keyIndex+1];
                  deltat = nextKey.time - keyData.time;
                  tangentNormalizedValues[i++] = keyData.outtangent.x / deltat;
                  tangentNormalizedValues[i++] = keyData.outtangent.y / keyData.outtangent.x;
                  tangentNormalizedValues[i++] = nextKey.intangent.x / deltat;
                  tangentNormalizedValues[i++] = nextKey.intangent.y / nextKey.intangent.x;
                }
            })
            .addOnDragCallback(
              function(evt) {
                var keyGsVal = screenXfo.toGraphSpace(evt.localPos);
                keyData.time = keyGsVal.x;
                keyData.value = keyGsVal.y;
    
                var deltat, i=0;
                if(keyIndex>0){
                  deltat = keyData.time - prevKey.time;
                  prevKey.outtangent.x = deltat * tangentNormalizedValues[i++];
                  prevKey.outtangent.y = prevKey.outtangent.x * tangentNormalizedValues[i++];
                  keyData.intangent.x = deltat * tangentNormalizedValues[i++];
                  keyData.intangent.y = keyData.intangent.x * tangentNormalizedValues[i++];
                  prevKey.setOutTan(prevKey.outtangent);
                  keyData.setInTan(keyData.intangent);
                }
                if(keyIndex<trackData.keys.length){
                  deltat = nextKey.time - keyData.time;
                  keyData.outtangent.x = deltat * tangentNormalizedValues[i++];
                  keyData.outtangent.y = keyData.outtangent.x * tangentNormalizedValues[i++];
                  nextKey.intangent.x = deltat * tangentNormalizedValues[i++];
                  nextKey.intangent.y = nextKey.intangent.x * tangentNormalizedValues[i++];
                  keyData.setOutTan(keyData.outtangent);
                  nextKey.setInTan(nextKey.intangent);
                }
                
                keyframeTrackNode.setKeyData(trackIndex, keyIndex, keyData);
                updateCurve();
                scene.redrawAllWindows();
              });
          var keyNode = keyGroupNode.createRect().translate(-4, -4).size(8, 8).stroke(FABRIC.rgb(1, 1, 1));
          
          
          ///////////////////////////////////////////////
          // In Tangent
          if(keyData.time > timeRange.x){
            var inTanSsVal = screenXfo.toScreenSpace(keyData.intangent, true);
            var inTanLineNode = keyGroupNode.createPath().addClass('KeyframeHandle');
            inTanLineNode.attr('d', 'M 0 0 L ' + inTanSsVal.x + ' ' + inTanSsVal.y);
            var inTanNode = keyGroupNode.createRect()
                                                .translate(inTanSsVal.x - 3, inTanSsVal.y - 3)
                                                .size(6, 6).stroke(FABRIC.rgb(1, 1, 1));
            inTanNode.draggable({ mouseButton: 0 })
              .addOnDragCallback(
                function(evt) {
                  inTanLineNode.attr('d', 'M 0 0 L ' + (evt.localPos.x + 3) + ' ' + (evt.localPos.y + 3));
                  keyData.intangent = screenXfo.toGraphSpace(evt.localPos, true);
                  keyframeTrackNode.setKeyData(trackIndex, keyIndex, keyData);
                  updateCurve();
                  scene.redrawAllWindows();
                });
          }
          keyData.setInTan = function(intangent){
            keyData.intangent = intangent;
            if(inTanNode){
              var inTanSsVal = screenXfo.toScreenSpace(keyData.intangent, true);
              inTanNode.translate(inTanSsVal.x - 3, inTanSsVal.y - 3)
              inTanLineNode.attr('d', 'M 0 0 L ' + inTanSsVal.x + ' ' + inTanSsVal.y);
            }
            keyframeTrackNode.setKeyData(trackIndex, keyIndex, keyData);
          }
          ///////////////////////////////////////////////
          // Out Tangent
          if(keyData.time < timeRange.y){
            var outTanSsVal = screenXfo.toScreenSpace(keyData.outtangent, true);
            var outTanLineNode = keyGroupNode.createPath().addClass('KeyframeHandle');
            outTanLineNode.attr('d', 'M 0 0 L ' + outTanSsVal.x + ' ' + outTanSsVal.y);
            var outTanNode = keyGroupNode.createRect()
                                                 .translate(outTanSsVal.x - 3, outTanSsVal.y - 3)
                                                 .size(6, 6).stroke(FABRIC.rgb(1, 1, 1));
    
            outTanNode.draggable({ mouseButton: 0 })
              .addOnDragCallback(
                function(evt) {
                  outTanLineNode.attr('d', 'M 0 0 L ' + (evt.localPos.x + 3) + ' ' + (evt.localPos.y + 3));
                  keyData.outtangent = screenXfo.toGraphSpace(evt.localPos, true);
                  keyframeTrackNode.setKeyData(trackIndex, keyIndex, keyData);
                  updateCurve();
                  scene.redrawAllWindows();
                });
          }
          keyData.setOutTan = function(outtangent){
            keyData.outtangent = outtangent;
            if(outTanNode){
              var outTanSsVal = screenXfo.toScreenSpace(keyData.outtangent, true);
              outTanNode.translate(outTanSsVal.x - 3, outTanSsVal.y - 3)
              outTanLineNode.attr('d', 'M 0 0 L ' + outTanSsVal.x + ' ' + outTanSsVal.y);
            }
            keyframeTrackNode.setKeyData(trackIndex, keyIndex, keyData);
          }
        }
      }
      if (window.drawKeys !== false) {
        var trackData = keyframeTrackNode.getTrackData(trackIndex);
        for (var i = 0; i < trackData.keys.length; i++) {
          drawKey(i, trackData.keys[i]);
        }
      }
    }
    
    for (var i = 0; i < trackCount; i++) {
      drawTrackCurve(i);
    }
  }
  
  drawTrackCurves();
  
  if(options.timeStripe){
    var timeStripeGroupNode = graphCenterGroup.createGroup()
        .translate((scene.animation.getTime() + screenXfo.tr.x)  * screenXfo.sc.x, windowHeight * -0.5)
        .draggable({ mouseButton: 0, axis: 'X' })
        .addOnDragCallback(
          function(evt) {
            scene.animation.setTime((evt.localPos.x / screenXfo.sc.x) - screenXfo.tr.x);
          });
  
    timeStripeGroupNode.createRect().size(10, windowHeight).addClass('EventCatcher');
    var timeStripe = timeStripeGroupNode.createPath().addClass('TimeStripePath')
        .attr('d', 'M 5 0 L 5 ' + windowHeight);
  
    window.updateGraphTimeStripe = function() {
      timeStripeGroupNode.translate((scene.animation.getTime() + screenXfo.tr.x)  * screenXfo.sc.x, windowHeight * -0.5);
    }
  }
  
  var updateTimeRange = function(){
    for (var i = 0; i < trackCount; i++) {
      trackDisplayNodes[i].setTimeRange(timeRange);
      curvesData[i] = trackDisplayNodes[i].getCurveData();
    }
    updateGraphTimeStripe();
    keysHolderGroup.removeAllChildren();
    drawTrackCurves();
  }
  
  var fitCurveEditorToWindow = function(){
    var newWindowWidth = $('#viewer').width();
    var newWindowHeight = $('#viewer').height();
    
    timeRange.y += ( newWindowWidth - windowWidth ) / screenXfo.sc.x;
    windowWidth = newWindowWidth;
    windowHeight = newWindowHeight;
    graphCenterGroup.translate(0, windowHeight * 0.5);
    graphBGRect.size(windowWidth, windowHeight);
    timeStripe.attr('d', 'M 5 0 L 5 ' + windowHeight);
    
    updateTimeRange();
  }
  
  if(options.draggable){
    var dragStartTimeRange;
    var dragStartOffset;
    graphBGRect.draggable( {mouseButton:1, delegateTranslateObj:false, highlight:false } )
      .addOnDragBeginCallback(
        function(evt){
          dragStartTimeRange = timeRange.clone();
          dragStartOffset = screenXfo.tr.clone();
      })
      .addOnDragCallback(
        function(evt){
          timeRange.x = dragStartTimeRange.x - (evt.dragVec.x / screenXfo.sc.x);
          timeRange.y = dragStartTimeRange.y - (evt.dragVec.x / screenXfo.sc.x);
          screenXfo.tr = dragStartOffset.add(evt.dragVec.multiply(screenXfo.sc.invert()));
          updateTimeRange();
        });
  }
  
  if(options.zoomable){
    var mouseWheelZoomFn = function(evt) {
      var zoomDist = evt.wheelDelta * 0.1;
      timeRange.x += zoomDist / screenXfo.sc.x;
      timeRange.y -= zoomDist / screenXfo.sc.x;
      yRange.x -= zoomDist / screenXfo.sc.y;
      yRange.y += zoomDist / screenXfo.sc.y;
      screenXfo.sc.x = windowWidth/(timeRange.y - timeRange.x);
      screenXfo.sc.y = -(windowHeight - 40) / (yRange.y - yRange.x)
      screenXfo.tr.x = -timeRange.x;
    // screenXfo.tr.y = (yRange.y + yRange.x) * -0.5;  
      updateTimeRange();
    }
    
    rootDomNode.addEventListener('mouseover', function(){
      document.addEventListener('mousewheel', mouseWheelZoomFn, false);
    }, true);
    
    rootDomNode.addEventListener('mouseout', function(){
      document.removeEventListener('mousewheel', mouseWheelZoomFn, false);
    }, true);
  }
  return {
    resize: function(){
      fitCurveEditorToWindow();
    }
  }
};
