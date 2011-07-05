
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//

// TODO: Move this function into a namespace. FABRIC.helpers possibly.
function clone_obj(obj, deepclone) {
    var c = obj instanceof Array ? [] : {};

    for (var i in obj) {
        var prop = obj[i];

        if (deepclone == true && typeof prop == 'object') {
           if (prop instanceof Array) {
               c[i] = [];

               for (var j = 0; j < prop.length; j++) {
                   if (typeof prop[j] != 'object') {
                       c[i].push(prop[j]);
                   } else {
                       c[i].push(clone_obj(prop[j]));
                   }
               }
           } else {
               c[i] = clone_obj(prop);
           }
        } else {
           c[i] = prop;
        }
    }

    return c;
}

/**
 * SVG defines the dom graphic utility.
 */
FABRIC.SVG = FABRIC.SVG ? FABRIC.SVG : {};

/**
 * Constructor to create the root element for the
 * SVG dom.
 * @constructor
 * @param {string} domRootID The dom id of the root element.
 */
FABRIC.createSVGRootElem = function(domRootID) {

  var SVGFactory = function(type) {
    this.elem = this.createSVGElement(type);
    this.elem.obj = this;
    this.type = type;

    if (this.type == 'svg') {
      this.extend(this.extend(this, this.svgObj), this.groupObj);
    //  this.defs = this.appendAndReturnChild(this.extend(this.create("defs"), this.groupObj));
    }
  }

  SVGFactory.prototype = {
    svgns: 'http://www.w3.org/2000/svg',
    createSVGElement: function(type)
    {
      return document.createElementNS(this.svgns, type);
    },
    appendTo: function(parentNode) {
      parentNode.elem.appendChild(this.elem);
      this.parent = parentNode;
      return this;
    },
    moveToTop: function() {
      this.parent.elem.appendChild(this.elem);
      return this;
    },
    insertBefore: function(child, position) {
      this.elem.insertBefore(child.elem, position.elem);
    },
    destroy: function() {
      if (this.parent) {
        this.parent.elem.removeChild(this.elem);
      }
    },
    remove: function() {
      if (this.parent) {
        this.parent.elem.removeChild(this.elem);
      }
    },
    extend: function(obj, extra, deepcopy) {
      for (i in extra) {
        var prop = extra[i];
        if (typeof prop == 'object' && deepcopy != false) {

          obj[i] = clone_obj(prop, true);
        } else {
          obj[i] = prop;
        }
      }
      return obj;
    },
    ///////////////////////////////////////////////
    // Base object
    typeName: function(t) {
      if (arguments.length === 1) {
        this.elem.typeName = arguments[0];
        return this;
      }else {
        return this.elem.typeName;
      }
    },
    // Get or set an attribute.
    attr: function() {
      if (arguments.length === 1) {
        return this.elem.getAttributeNS(null, arguments[0]);
      }else {
    //  if(arguments[1] && ((typeof arguments[1])==="string") && arguments[1].length > 0){
        this.elem.setAttributeNS(null, arguments[0], arguments[1]);
        return this;
     //  }else{
     //    this.elem.removeAttributeNS(null, arguments[0]);
     //  }
      }
    },
    hasClass: function(value) {
      return this.attr('class').split(' ').indexOf(value) != -1;
    },
    addClass: function(value) {
      if (value && typeof value === 'string') {
        var newClassNames = value.split(' ');
        var classNames = this.attr('class').split(' ');
        for (var c = 0, cl = newClassNames.length; c < cl; c++) {
          if (classNames.indexOf(newClassNames[c]) < 0) {
            classNames.push(newClassNames[c]);
          }
        }
        this.attr('class', classNames.join(' '));
      }
      return this;
    },
    removeClass: function(value) {
      if (value) {
        var oldClassNames = value.split(' ');
        var classNames = this.attr('class').split(' ');
        for (var c = 0, cl = oldClassNames.length; c < cl; c++) {
          if (classNames.indexOf(oldClassNames[c]) >= 0) {
            classNames.splice(classNames.indexOf(oldClassNames[c]), 1);
          }
        }
        this.attr('class', classNames.join(' '));

      } else {
        this.attr('class', '');
      }
      return this;
    },
    id: function(id) {
      if (arguments.length === 0) {
        return this.attr('id');
      }
      else if (arguments.length === 1 && (typeof arguments[0]) == 'string') {
        this.attr('id', arguments[0]);
      }
      return this;
    },
    eventCatcher: function() {
      this.addClass('EventCatcher');
      return this;
    },
    visible: function() {
      if (arguments.length === 0) {
        return this.__visible;
      }
      else if (arguments.length === 1 && (typeof arguments[0]) == 'bollean') {
        this.__visible = arguments[0];
      }
      return this;
    },
    color: function() {
      if (arguments.length === 0) {
        var str = this.attr('fill');
        if (str) {
          return (FABRIC.RT.rgb255(parseFloat(str.split('(')[1].split(',')[0]),
            parseFloat(str.split('(')[1].split(',')[1]), parseFloat(str.split('(')[1].split(',')[2])));
        }else {
          return FABRIC.RT.rgb255(0, 0, 0);
        }
      }
      else if (arguments.length === 1 && FABRIC.RT.isColor(arguments[0])) {
        this.attr('fill', arguments[0].toRGB255Str());
      }
      else if (arguments.length === 1 && (typeof arguments[0]) == 'string') {
        this.attr('fill', arguments[0]);
      }
      return this;
    },
    stroke: function() {
      if (arguments.length === 0) {
        var str = this.attr('stroke');
        if (str) {
          return (FABRIC.RT.rgb255(parseFloat(str.split('(')[1].split(',')[0]),
            parseFloat(str.split('(')[1].split(',')[1]), parseFloat(str.split('(')[1].split(',')[2])));
        }else {
          return FABRIC.RT.rgb255(0, 0, 0);
        }
      }
      else if (arguments.length === 1 && FABRIC.RT.isColor(arguments[0])) {
        this.attr('stroke', arguments[0].toRGB255Str());
      }
      else if (arguments.length === 1 && (typeof arguments[0]) == 'string') {
        this.attr('stroke', arguments[0]);
      }
      return this;
    },
    screenToLocalPos: function(pos) {
      if (this.parent) {
         // Recurse up throught the hierarchy accumulating the transforms.
        var fn = function(pos) {
          if (this.parent != this.svgRoot) {
            pos = fn.call(this.parent, pos);
          }
          var str = this.attr('transform');
          if (str.indexOf('translate') === 0) {
            pos.subInPlace(this.translate());
          }else if (str.indexOf('scale') === 0) {
            pos.scaleInPlace(1 / this.scale());
          }
          return pos;
        }
        return fn.call(this.parent, pos);
      }else {
        return pos;
      }
    },
    screenToObjectPos: function(pos) {
      if (this.parent) {
        // Recurse up throught the hierarchy accumulating the transforms.
        var fn = function(pos) {
        if (this.parent != this.svgRoot) {
          pos = fn.call(this.parent, pos);
        }
        var str = this.attr('transform');
        if (str.indexOf('translate') === 0) {
          pos.subInPlace(this.translate());
        }else if (str.indexOf('scale') === 0) {
          pos.scaleInPlace(1 / this.scale());
        }
        return pos;
        }
        return fn.call(this, pos);
      }else {
        return pos;
      }
    },
    localToScreenPos: function(pos) {
      if (this.parent) {
        // Recurse up throught the hierarchy accumulating the transforms.
        var fn = function(pos) {
          var str = this.attr('transform');
          if (str.indexOf('translate') === 0) {
            pos.addInPlace(this.translate());
          }else if (str.indexOf('scale') === 0) {
            pos.scaleInPlace(this.scale());
          }
          if (this.parent != this.svgRoot) {
            pos = fn.call(this.parent, pos);
          }
          return pos;
        }
        return fn.call(this.parent, pos);
      }else {
        return pos;
      }
    },
    localPos: function(wrt) {
      // Calculate the position of a node relative to some
      // parent in the hierarchy.
      if (!wrt) {
        wrt = this.parent;
      }
      var fn = function(pos) {
        var str = this.attr('transform');
        if (str.indexOf('translate') === 0) {
          pos.addInPlace(this.translate());
        }else if (str.indexOf('scale') === 0) {
          pos.scaleInPlace(this.scale());
        }
        if (this.parent != this.svgRoot && this.parent != wrt) {
          pos = fn.call(this.parent, pos);
        }
        return pos;
      }
      return fn.call(this, FABRIC.RT.vec2(0, 0));
    },
    translate: function() {
      if (arguments.length === 0) {
        var str = this.attr('transform');
        if (str) {
          return (FABRIC.RT.vec2(parseFloat(str.split('(')[1].split(',')[0]),
            parseFloat(str.split(')')[0].split(',')[1])));
        }else {
          return FABRIC.RT.vec2(0, 0);
        }
      }
      else if (arguments.length === 1 && FABRIC.RT.isVec2(arguments[0])) {
        this.attr('transform', 'translate(' + arguments[0].x + ',' + arguments[0].y + ')');
      }
      else if (arguments.length === 2 &&
               (typeof arguments[0]) == 'number' &&
               (typeof arguments[1]) == 'number') {
        this.attr('transform', 'translate(' + arguments[0] + ',' + arguments[1] + ')');
      }
      return this;
    },
    scale: function(scl) {
      if (arguments.length === 0) {
        var str = this.attr('transform');
        return parseFloat(str.split('(')[1].split(',')[0]);
      }
      else if (arguments.length === 1 && (typeof arguments[0]) == 'number') {
        this.attr('transform', 'scale(' + arguments[0] + ')');
      }
      return this;
    },
    size: function() {

      if (arguments.length === 0) {
        var str = this.attr('width');
        return str;
      }
      return this;
    },
    cursor: function(cursor) {
      this.elem.style.cursor = cursor;
      return this;
    },
    addEventHandler: function(eventName, eventHandlerFN) {
      this.elem.addEventListener(eventName, eventHandlerFN, false);
    },
    highlight: function(options) {
      options = this.extend({
        setClasses: true,
        addClass: 'Highlighted',
        setCursor: false,
        cursor: 'default',
        highlightObj: undefined
      }, options, false);
      var self = this;


      // Callbacks
      // onHighlight
      var onHighlightCallbacks = [];
      this.addOnHighlightCallback = function(cb) {
        onHighlightCallbacks.push(cb);
        return this;
      };
      this.removeOnHighlightCallback = function(cb) {
        var id = onHighlightCallbacks.indexOf(cb);
        if (id !== -1) {
          onHighlightCallbacks.remove(id, id);
        }
        return this;
      };
      var fireOnHighlightCallbacks = function(evt) {
        for (var i = 0; i < onHighlightCallbacks.length; i++) {
          onHighlightCallbacks[i].call(self, evt);
        }
      };
      // onUnHighlight
      var onUnHighlightCallbacks = [];
      this.addOnUnHighlightCallback = function(cb) {
        onUnHighlightCallbacks.push(cb);
        return this;
      };
      this.removeOnUnHighlightCallback = function(cb) {
        var id = onUnHighlightCallbacks.indexOf(cb);
        if (id !== -1) {
          onUnHighlightCallbacks.remove(id, id);
        }
        return this;
      };
      var fireOnUnHighlightCallbacks = function(evt) {
        for (var i = 0; i < onUnHighlightCallbacks.length; i++) {
          onUnHighlightCallbacks[i].call(self, evt);
        }
      };

      var highlightFn = function(evt) {
        if (self.svgRoot.state !== 'Normal') {
          return;
        }
        if (/*options.mouseButton === -1 &&*/ options.setCursor) {
          self.cursor(options.cursor);
        }
        (options.highlightObj ? options.highlightObj : self).addClass(options.addClass);
        fireOnHighlightCallbacks(evt);
        var unhighlightFn = function(evt) {
          if (/*options.mouseButton === -1 &&*/ options.setCursor) {
            self.cursor('default');
          }
          (options.highlightObj ? options.highlightObj : self).removeClass(options.addClass);
          fireOnUnHighlightCallbacks(evt);
          self.elem.removeEventListener('mouseout', unhighlightFn, false);
        //  evt.preventDefault();
        //  evt.stopPropagation();
        }
        self.elem.addEventListener('mouseout', unhighlightFn, false);
      //  evt.preventDefault();
      //  evt.stopPropagation();
      }
      this.elem.addEventListener('mouseover', highlightFn, false);
      return this;
    },
    // MARK: draggable
    draggable: function(options) {
      options = this.extend({
        /*  dragHandle:null, :The object that us used to drag this node around*/
        highlight: true,
        highlightObj: undefined,
        addClasses: true,
        setCursor: true,
        cursor: 'move',
        containment: undefined,
        delegateTranslateObj: undefined, /*: The node that we apply the translate calls to instead of this */
        preventDefault: true,
        axis: undefined,
        snapSize: 0,
        mouseButton: -1, /* by default any mouse button will initite a drag */
        snapTargets: undefined,
        snapDistance: 10
      }, options, false);

      var self = this;

      this.setContainmentObject = function(obj) {
        options.containment = obj;
        return this;
      };
      this.setSnapTargets = function(targets) {
        options.snapTargets = targets;
        return this;
      };

      // Callbacks
      // onDragBegin
      var onDragBeginCallbacks = [];
      this.addOnDragBeginCallback = function(cb) {
        onDragBeginCallbacks.push(cb);
        return this;
      };
      this.removeOnDragBeginCallback = function(cb) {
        var id = onDragBeginCallbacks.indexOf(cb);
        if (id !== -1) {
          onDragBeginCallbacks.remove(id, id);
        }
        return this;
      };
      var fireOnDragBeginCallbacks = function(evt) {
        for (var i = 0; i < onDragBeginCallbacks.length; i++) {
          onDragBeginCallbacks[i].call(self, evt);
        }
      };
      // onDrag
      var onDragCallbacks = [];
      this.addOnDragCallback = function(cb) {
        onDragCallbacks.push(cb);
        return this;
      };
      this.removeOnDragCallback = function(cb) {
        var id = onDragCallbacks.indexOf(cb);
        if (id !== -1) {
          onDragCallbacks.remove(id, id);
        }
        return this;
      };
      var fireOnDragCallbacks = function(evt) {
        for (var i = 0; i < onDragCallbacks.length; i++) {
          onDragCallbacks[i].call(self, evt);
        }
      };
      // onDragEnd
      var onDragEndCallbacks = [];
      this.addOnDragEndCallback = function(cb) {
        onDragEndCallbacks.push(cb);
        return this;
      };
      this.removeOnDragEndCallback = function(cb) {
        var id = onDragEndCallbacks.indexOf(cb);
        if (id !== -1) {
          onDragEndCallbacks.remove(id, id);
        }
        return this;
      };
      var fireOnDragEndCallbacks = function(evt) {
        for (var i = 0; i < onDragEndCallbacks.length; i++) {
          onDragEndCallbacks[i].call(self, evt);
        }
      };
      // Draggable implimentation

      if (options.highlight) {
        this.highlight(
        {
          setCursor: true,
          cursor: 'move',
          highlightObj: options.highlightObj
        });
      }

      this.elem.addEventListener('mousedown',
        function(evt) {
          if (options.mouseButton === -1 || evt.button === options.mouseButton) {
            if (options.mouseButton !== -1 && options.setCursor) {
              self.cursor(options.cursor);
            }
            // if we have a right click happening,
            // let's fake a mouse up event for the drag
            if (evt.button === 2) {
              var mouseUpEvt = document.createEvent('MouseEvents');
              mouseUpEvt.initMouseEvent('mouseup', true, true, window, 0,
                evt.screenX, evt.screenY, evt.clientX, evt.clientY, false, false, false, false, evt.button, null);
              self.elem.dispatchEvent(mouseUpEvt);
              return;
            }

            fireOnDragBeginCallbacks(evt);
            var pos;
            // We can use a delegate object when the event catcher is not the node we want transformed.
            var dragNode = (options.delegateTranslateObj !== undefined ? options.delegateTranslateObj : self);
            var mouseDraggedStartPos = dragNode ? dragNode.screenToLocalPos(FABRIC.RT.vec2(evt.clientX, evt.clientY)) : FABRIC.RT.vec2(evt.clientX, evt.clientY);
            var draggedStartPos = dragNode ? dragNode.translate() : FABRIC.RT.vec2(0, 0);

            var dragFn = function(evt) {
              if (options.mouseButton !== -1 && evt.button !== options.mouseButton) {
                // the mouse went off the screen and we did not recieve a mouse up event.
                // Fake one here.
                var mouseUpEvt = document.createEvent('MouseEvents');
                mouseUpEvt.initMouseEvent('mouseup', true, true, window, 0,
                  evt.screenX, evt.screenY, evt.clientX, evt.clientY, false, false, false, false, evt.button, null);
                self.elem.dispatchEvent(mouseUpEvt);
                return;
              }
              var mousePos = dragNode ? dragNode.screenToLocalPos(FABRIC.RT.vec2(evt.clientX, evt.clientY)) : FABRIC.RT.vec2(evt.clientX, evt.clientY);
              var delta = mousePos.subtract(mouseDraggedStartPos);
              pos = draggedStartPos.add(delta);
              if (options.containment) {
                var canvasSize = options.containment.size();
                var size = self.size();
                pos = pos.clamp(FABRIC.RT.vec2(0, 0), canvasSize.subtract(size));
              }
              if (options.snapSize > 0) {
                pos.scaleInPlace(1.0 / options.snapSize);
                pos.x = Math.round(pos.x);
                pos.y = Math.round(pos.y);
                pos.scaleInPlace(options.snapSize);
              }
              if (options.axis === 'X') {
                pos.y = draggedStartPos.y;
              }
              if (options.axis === 'Y') {
                pos.x = draggedStartPos.x;
              }
              // Snap Targets
              if (options.snapTargets) {
                for (i in options.snapTargets) {
                  if (options.snapTargets.hasOwnProperty(i)) {
                    var dist = pos.subtract(options.snapTargets[i]).length();
                    if (dist < options.snapDistance) {
                      pos = options.snapTargets[i];
                    }
                  }
                }
              }
              if(dragNode){
                // There are cases where we catch and process drag events, but
                // do not apply the dragging to any node. This is used in the
                // curve editor for panning the graph, where thr graph is actually
                // rebuilt.
                dragNode.translate(pos);
              }
              evt.preventDefault();
              evt.stopPropagation();
              
              evt.localPos = pos;
              evt.dragVec = pos.subtract(draggedStartPos);
              fireOnDragCallbacks(evt);
            }
            releaseFn = function(evt) {
              if (options.mouseButton !== -1 && options.setCursor) {
                self.cursor('default');
              }

              self.svgRoot.elem.removeEventListener('mouseup', releaseFn, false);
              self.svgRoot.elem.removeEventListener('mousemove', dragFn, false);
              evt.preventDefault();
              evt.stopPropagation();
              evt.localPos = pos;
              fireOnDragEndCallbacks(evt);
            }
            self.svgRoot.elem.addEventListener('mouseup', releaseFn, false);
            evt.preventDefault();
            evt.stopPropagation();
          }
          self.svgRoot.elem.addEventListener('mousemove', dragFn, false);
        }, false);
      return this;
    },
    // MARK: zoomable
    zoomable: function(options) {
      options = this.extend({
        zoomRate: 0.800,
        delegateZoomObj: undefined
      }, options, false);

      // Callbacks
      // onZoom
      var onZoomCallbacks = [];
      this.addOnZoomCallback = function(cb) {
        onZoomCallbacks.push(cb);
        return this;
      };
      this.removeOnZoomCallback = function(cb) {
        var id = onZoomCallbacks.indexOf(cb);
        if (id !== -1) {
          onZoomCallbacks.remove(id, id);
        }
        return this;
      };
      var fireOnZoomCallbacks = function(evt) {
        for (var i = 0; i < onZoomCallbacks.length; i++) {
          onZoomCallbacks[i].call(self, evt);
        }
      };

      var self = this;
      var activateZoomFn = function(evt) {
        var zoomFn = function(evt) {
          var currentZoom = (options.delegateZoomObj ? options.delegateZoomObj : self).scale();
          evt.zoomfactor = currentZoom + ((evt.wheelDelta * (options.zoomRate / 1000)) * currentZoom);
          (options.delegateZoomObj ? options.delegateZoomObj : self).scale(Math.max(evt.zoomfactor, 0.1));
          evt.zoomValue = (options.delegateZoomObj ? options.delegateZoomObj : self).scale();
          fireOnZoomCallbacks(evt);
          evt.preventDefault();
          evt.stopPropagation();
        }
        document.addEventListener('mousewheel', zoomFn, false);
        var deactivateZoomFn = function(evt) {
          self.elem.removeEventListener('mouseout', deactivateZoomFn, false);
          document.removeEventListener('mousewheel', zoomFn, false);
        }
        self.elem.addEventListener('mouseout', deactivateZoomFn, false);
      }
      this.elem.addEventListener('mouseover', activateZoomFn, false);
      return this;
    },
    // MARK: selectable
    selectable: function(options) {
      options = this.extend({
        multiSelectable: true,
        multiSelectKey: null,
        highlightObj: undefined
      }, options, false);

      // Callbacks
      // onSelect
      var onSelectCallbacks = [];
      this.addOnSelectCallback = function(cb) {
        onSelectCallbacks.push(cb);
            return this;
      };
      this.removeOnSelectCallback = function(cb) {
        var id = onSelectCallbacks.indexOf(cb);
        if (id !== -1) {
          onSelectCallbacks.remove(id, id);
        }
        return this;
      };
      var fireOnSelectCallbacks = function(evt) {
        for (var i = 0; i < onSelectCallbacks.length; i++) {
          onSelectCallbacks[i].call(self, evt);
        }
      };
      // onDeSelect
      var onDeselectCallbacks = [];
      this.addOnDeselectCallback = function(cb) {
        onDeselectCallbacks.push(cb);
        return this;
      };
      this.removeOnDeselectCallback = function(cb) {
        var id = onDeselectCallbacks.indexOf(cb);
          if (id !== -1) {
          onDeselectCallbacks.remove(id, id);
        }
        return this;
      };
      var fireOnDeselectCallbacks = function(evt) {
        for (var i = 0; i < onDeselectCallbacks.length; i++) {
          onDeselectCallbacks[i].call(self, evt);
        }
      };

      var selected = false;
      this.select = function(addToSelection) {
        (options.highlightObj ? options.highlightObj : self).addClass('Selected');
        if (addToSelection) {
          self.svgRoot.addToSelection(self);
        }else {
          self.svgRoot.replaceSelection([self]);
        }
        selected = true;
        fireOnSelectCallbacks();
      }
      this.deselect = function() {
        (options.highlightObj ? options.highlightObj : self).removeClass('Selected');
        self.svgRoot.removeFromSelection(self);
        selected = false;
        fireOnDeselectCallbacks();
      };

      var self = this;
        this.elem.addEventListener('mousedown',
          function(evt) {
            if (options.multiSelectable && options.multiSelectKey == 'ctrl' && evt.ctrl) {
              if (!selected) {
                self.select(true);
              }else {
                self.deselect();
              }
            }else {
              self.select(false);
            }
            evt.preventDefault();
            evt.stopPropagation();
          }, /*useCapture*/ false);
      return this;
    },
    // MARK: button
    button: function(options) {
      options = this.extend({
        checkButton: false,
        multiSelectKey: 0,
        addClasses: true,
        highlight: true
      }, options, false);

      var buttonState = false;
      var self = this;
      ///////////////////////////////////
      // Callbacks
      var onClickCallbacks = [];
      this.addOnClickCallback = function(cb) {
        onClickCallbacks.push(cb);
        return this;
      };
      this.removeOnClickCallback = function(cb) {
      var id = onClickCallbacks.indexOf(cb);
        if (id !== -1) {
          onClickCallbacks.remove(id, id);
        }
        return this;
      };
      var fireOnClickCallbacks = function(evt) {
        for (var i = 0; i < onClickCallbacks.length; i++) {
          onClickCallbacks[i].call(self, evt);
        }
      };
      var onMouseDownCallbacks = [];
      this.addOnMouseDownCallback = function(cb) {
        onMouseDownCallbacks.push(cb);
        return this;
      };
      this.removeOnMouseDownCallback = function(cb) {
        var id = onMouseDownCallbacks.indexOf(cb);
        if (id !== -1) {
          onMouseDownCallbacks.remove(id, id);
        }
        return this;
      };
      var fireOnMouseDownCallbacks = function(evt) {
        for (var i = 0; i < onMouseDownCallbacks.length; i++) {
          onMouseDownCallbacks[i].call(self, evt);
        }
      };

      ///////////////////////////////////
      // Events
      var self = this;
      var highlightFn = function(evt) {
        self.cursor('default');
        if (options.highlight) {
          self.addClass('Highlighted');
        }
        var unhighlightFn = function(evt) {
        //  self.cursor('default');
          if (options.highlight) {
            self.removeClass('Highlighted');
          }
          self.elem.removeEventListener('mouseout', unhighlightFn, false);
        }
        self.elem.addEventListener('mouseout', unhighlightFn, false);
      }
      this.elem.addEventListener('mouseover', highlightFn, false);
      this.elem.addEventListener('mousedown',
        function(evt) {
          if (evt.button === 0)
          {
            if (options.checkButton === true) {
              buttonState = !buttonState;
              if (options.addClasses) {
                if (buttonState) {
                  //self.addClass("Pressed");
                  self.attr('style', 'stroke: white; stroke-width: 2.5px;');
                }else {
                  //self.removeClass("Pressed");
                  self.attr('style', '');
                }
              }
              fireOnClickCallbacks(evt);
            }else {
              fireOnMouseDownCallbacks(evt);
              if (options.addClasses) {
              //  self.removeClass("Pressed");
                self.attr('style', 'stroke: white; stroke-width: 2.5px;');
              }
            }
            evt.preventDefault();
            evt.stopPropagation();

            if (!options.checkButton) {
              var releaseButtonFn = function(evt) {
                if (options.addClasses) {
                  //  self.removeClass("Pressed");
                  self.attr('style', '');
                }
                fireOnClickCallbacks(evt);
                self.elem.removeEventListener('mouseup', releaseButtonFn, false);
              }
              self.elem.addEventListener('mouseup', releaseButtonFn, false);
              evt.preventDefault();
              evt.stopPropagation();
            }

            var mouseOutButtonFn = function(evt) {
              if (!options.checkButton && options.addClasses) {
              //   self.removeClass("Pressed");
                self.attr('style', '');
              }
              self.elem.removeEventListener('mouseout', mouseOutButtonFn, false);
            }
            self.elem.addEventListener('mouseout', mouseOutButtonFn, false);
          }
        }, false);
      return this;
    },
    setClipPath: function(id) {
      this.attr('style', 'clip-path: url(#' + id + ');');
      return this;
    },
    /////////////////////////////////////////////////////////////////////
    // MARK: svgObj
    svgObj: {
      state: 'Normal',
      selection: [],
      addToSelection: function(obj) {
        this.selection.push(obj);
      },
      replaceSelection: function(objArray) {
        this.selection = objArray;
      }
      /*  createClipPath:function(){
        return this.defs.appendAndReturnChild(this.extend(this.create("clipPath"), this.groupObj));
      },*/

    },
    /////////////////////////////////////////////////////////////////////
    // MARK: groupObj
    groupObj: {
      create: function(type) {
        var child = new SVGFactory(type);
        child.svgRoot = this.svgRoot ? this.svgRoot : this;
        return child;
      },
      __doAppendChild: function(child) {
        var childElem = child.ownerGroup ? child.ownerGroup.elem : (child.elem ? child.elem : child);
        this.elem.appendChild(childElem);
        child.parent = this;
      },
      appendAndReturnChild: function(child) {
        this.__doAppendChild(child);
        return child;
      },
      appendChild: function(child) {
        this.__doAppendChild(child);
        return this;
      },
      removeChild: function(child) {
        this.elem.removeChild(child.elem);
      },
      replaceChild: function(oldchild, newchild) {
        this.elem.replaceChild(oldchild.elem, newchild.elem);
      },
      removeAllChildren: function() {
        while (this.elem.firstChild) {
          this.elem.removeChild(this.elem.firstChild);
        }
        return this;
      },
      options: { sizeObj: undefined, size: FABRIC.RT.vec2(0, 0) },
      sizeObj: function(obj) {
        if (arguments.length === 0) {
          return this.options.sizeObj;
        }
        this.options.sizeObj = obj;
        return this;
      },
      size: function() {
        if (arguments.length === 0) {
          return (this.options.sizeObj ? this.options.sizeObj.size() : this.options.size);
        }
        if (this.options.sizeObj) {
          this.options.sizeObj.size.apply(this.options.sizeObj, arguments);
        }else if (arguments.length === 1 && FABRIC.RT.isVec2(arguments[0])) {
          this.options.size = arguments[0];
        }
        else if (arguments.length === 2 && (typeof arguments[0]) == 'number' && (typeof arguments[1]) == 'number') {
          this.options.size.x = (arguments[0] > 0 ? arguments[0] : 0);
          this.options.size.y = (arguments[1] > 0 ? arguments[1] : 0);
        }
        return this;
      },
      width: function() {
        if (arguments.length === 0) {
          return (this.options.sizeObj ? this.options.sizeObj.width() : this.options.size.x);
        }
        else if (arguments.length === 1 && (typeof arguments[0]) == 'number') {
          this.options.size.x = (arguments[0] > 0 ? arguments[0] : 0);
        }
        return this;
      },
      height: function() {
        if (arguments.length === 0) {
          return (this.options.sizeObj ? this.options.sizeObj.width() : this.options.size.y);
        }
        else if (arguments.length === 1 && (typeof arguments[0]) == 'number') {
          this.options.size.y = (arguments[0] > 0 ? arguments[0] : 0);
        }
        return this;
      },

      createDefs: function() {
        if (!this.defs) {
          this.defs = this.appendAndReturnChild(this.extend(this.create('defs'), this.groupObj));
        }
        return this.defs;
      },
      createClipPath: function() {
        if (!this.defs) {
          this.defs = this.appendAndReturnChild(this.extend(this.create('defs'), this.groupObj));
        }
        return this.defs.appendAndReturnChild(this.extend(this.create('clipPath'), this.groupObj));
      },
      // MARK: factoryFunctions
      // Composition rather than inheritance.
      // Create the base object with the SVG node type string, and the add all the relevant functions.
      createGroup: function() {
        return this.appendAndReturnChild(this.extend(this.create('g'), this.groupObj));
      },
      createText: function() {
        return this.appendAndReturnChild(this.extend(this.create('text'),
          {
            text: function() {
              if (arguments.length === 0) {
                return this.textNode.data;
              }
              else if (arguments.length === 1 && (typeof arguments[0]) == 'string') {
                if (!this.textNode) {
                  this.textNode = document.createTextNode(arguments[0]);
                  this.elem.appendChild(this.textNode);
                }else {
                  this.textNode.data = arguments[0];
                }
              }
              return this;
            },
            anchor: function(value) {
              if (arguments.length === 0) {
                return this.attr('text-anchor');
              }
              else if (arguments.length === 1 && (typeof arguments[0]) == 'string') {
                this.attr('text-anchor', value);
              }
              return this;
            },
            fontSize: function(value) {
              if (arguments.length === 0) {
                return this.attr('font-size');
              }
              else if (arguments.length === 1) {
                this.attr('font-size', value);
              }
              return this;
            },
            // This function catches mouse events and simply disables the default
            // Providing a delegate is usefull to allow
            preventSelection: function(options) {
              options = this.extend({
                  delegate: null
                }, options, false);
              this.elem.addEventListener('mousedown',
                function(evt) {
                  if (options.delegate &&
                      options.delegate.getEventListener &&
                      options.delegate.getEventListener('mousedown')) {
                    options.delegate.getEventListener('mousedown').call(options.delegate, evt);
                  }
                  evt.preventDefault();
                }, false);
              return this;
            }
          }));
      },
      // MARK: createRect
      createRect: function() {
        var __onSizeCallbacks = [];
        return this.appendAndReturnChild(this.extend(this.create('rect'),
        {
          addOnSizeCallback: function(cb) {
            __onSizeCallbacks.push(cb);
          },
          fireOnSizeCallbacks: function() {
            var size = this.size();
            for (var i = 0; i < __onSizeCallbacks.length; i++) {
              __onSizeCallbacks[i](size);
            }
          },
          size: function() {
            if (arguments.length === 0) {
              return FABRIC.RT.vec2(parseFloat(this.attr('width')), parseFloat(this.attr('height')));
            }
            else if (arguments.length === 1 && FABRIC.RT.isVec2(arguments[0])) {
              this.attr('width', arguments[0].x);
              this.attr('height', arguments[0].y);
            }
            else if (arguments.length === 2) {
              this.attr('width', arguments[0] > 0 ? arguments[0] : 0);
              this.attr('height', arguments[1] > 0 ? arguments[1] : 0);
            }
            this.fireOnSizeCallbacks();
            return this;
          },
          width: function() {
            if (arguments.length === 0) {
              return parseFloat(this.attr('width'));
            }
            else if (arguments.length === 1) {
              this.attr('width', arguments[0] > 0 ? arguments[0] : 0);
            }
            this.fireOnSizeCallbacks();
            return this;
          },
          height: function() {
            if (arguments.length === 0) {
              return parseFloat(this.attr('height'));
            }
            else if (arguments.length === 1) {
              this.attr('height', arguments[0] > 0 ? arguments[0] : 0);
            }
            this.fireOnSizeCallbacks();
            return this;
          },
          cornerRadius: function() {
            if (arguments.length === 0) {
              var rx = this.attr('rx');
              var ry = this.attr('ry');
              return FABRIC.RT.vec2(rx ? parseFloat(rx) : 0, ry ? parseFloat(ry) : 0);
            }
            else if (arguments.length === 1 && FABRIC.RT.isVec2(arguments[0])) {
              this.attr('rx', arguments[0].x);
              this.attr('ry', arguments[0].y);
            }
            else if (arguments.length === 1 && (typeof arguments[0]) == 'number') {
              this.attr('rx', arguments[0]);
              this.attr('ry', arguments[0]);
            }
            else if (arguments.length === 2 &&
                     (typeof arguments[0]) == 'number' &&
                     (typeof arguments[1]) == 'number') {
              this.attr('rx', arguments[0]);
              this.attr('ry', arguments[1]);
            }
            return this;
          },
          // MARK: resizable
          resizable: function(options) {
            options = this.extend({
                borderThickness: 20,
                onResize: null,
                minSize: FABRIC.RT.vec2(0, 0),
                width: true,
                height: true
              }, options, false);

            var self = this;

            // Callbacks
            var onResizeCallbacks = [];
            this.addOnResizeCallback = function(cb) {
              onResizeCallbacks.push(cb);
              return this;
            };
            var fireOnResizeCallbacks = function(evt) {
              for (var i = 0; i < onResizeCallbacks.length; i++) {
                onResizeCallbacks[i].call(self, evt);
              }
            };

            // Resizable implimentation
            var pos = this.translate();
            var rightBorderResizer, bottomBorderResizer, bottomRightBorderResizer;
            if (options.width) {
              rightBorderResizer = this.parent.createRect().addClass('EventCatcher').cursor('e-resize')
                .draggable({ axis: 'X', addClasses: false, setCursor: false, mouseButton: 0 }).
                  addOnDragCallback(function(evt) {
                    evt.size = FABRIC.RT.vec2(
                      evt.localPos.x + (options.borderThickness * 0.5) - pos.x,
                      self.size().y).max(options.minSize);
                    self.size(evt.size);
                    fireOnResizeCallbacks(evt);
                  });
            }
            if (options.height) {
              bottomBorderResizer = this.parent.createRect().addClass('EventCatcher').cursor('s-resize')
                .draggable({ axis: 'Y', addClasses: false, setCursor: false, mouseButton: 0 }).
                  addOnDragCallback(function(evt) {
                    evt.size = FABRIC.RT.vec2(
                      self.size().x,
                      evt.localPos.y + (options.borderThickness * 0.5) - pos.y).max(options.minSize);
                    self.size(evt.size);
                    fireOnResizeCallbacks(evt);
                  });
            }
            if (options.width && options.height) {
              bottomRightBorderResizer = this.parent.createCircle()
                .addClass('EventCatcher').radius(options.borderThickness * 0.5).cursor('se-resize')
                .draggable({ addClasses: false, setCursor: false, mouseButton: 0 }).
                  addOnDragCallback(function(evt) {
                    evt.size = evt.localPos.subtract(pos).max(options.minSize);
                    self.size(evt.size);
                    fireOnResizeCallbacks(evt);
                  });
            }

            var fnResizeSizers = function(size) {
              if (rightBorderResizer)
                rightBorderResizer.size(options.borderThickness, size.y)
                                  .translate(pos.x + size.x - (options.borderThickness * 0.5), pos.y);
              if (bottomBorderResizer)
                bottomBorderResizer.size(size.x, options.borderThickness)
                                   .translate(pos.x, pos.y + size.y - (options.borderThickness * 0.5));
              if (bottomRightBorderResizer)
                bottomRightBorderResizer.translate(pos.add(size));
            };
            fnResizeSizers.call(self, this.size());
            this.addOnSizeCallback(fnResizeSizers);
            return this;
          },
          dropShadow: function(options) {
            options = this.extend({
                offset: FABRIC.RT.vec2(5, 5)
              }, options, false);

            var dropShadow = this.parent.createRect().size(this.size())
                                                     .cornerRadius(this.cornerRadius())
                                                     .addClass('Shadow')
                                                     .translate(this.translate().addInPlace(options.offset));
            this.parent.insertBefore(dropShadow, this);
            this.addOnSizeCallback(function(size) { dropShadow.size(size);});
            return this;
          }
        }));
      },
      // MARK: createCircle
      createCircle: function() {
        return this.appendAndReturnChild(this.extend(this.create('circle'),
        {
          radius: function() {
            if (arguments.length === 0) {
              return this.attr('r');
            }
            else if (arguments.length === 1 && (typeof arguments[0]) == 'number') {
              this.attr('r', arguments[0]);
            }
            return this;
          },
          size: function() {
            // TODO: I think 'size' should always return a Vec2 so that it can be used to align text etc..
            if (arguments.length === 0) {
              var r = this.radius() * 2.0;
              return FABRIC.RT.vec2(r, r);
            }
            else if (arguments.length === 1 && (typeof arguments[0]) == 'number') {
              this.radius(arguments[0].x * 0.5);
            }
            return this;
          },
          dropShadow: function(options) {
            options = this.extend({
                offset: FABRIC.RT.vec2(5, 5),
                shadowParent: this
              }, options, false);
            var dropShadow = this.createCircle().size(this.size())
                                                .radius(this.radius())
                                                .addClass('Shadow')
                                                .translate(options.offset);
            this.parent.insertBefore(dropShadow, this);
            this.addOnSizeCallback(function(size) { dropShadow.size(size);});
            return this;
          }
        }));
      },
      // MARK: createList
      createList: function(options) {
        options = this.extend({ direction: 'Y', padding: 3 }, options, false);
        var __sizeObj;
        var listItems = [];
        return this.appendAndReturnChild(this.extend(this.createGroup(),
        {
          sizeObj: function() {
            if (arguments.length === 0) {
              return __sizeObj;
            }
            else if (arguments.length === 1 && (typeof arguments[0]) == 'object') {
              __sizeObj = arguments[0];
              var self = this;
              if (__sizeObj.addOnSizeCallback) {
                __sizeObj.addOnSizeCallback(function(size) { self.size(size); });
              }
            }
            return this;
          },
          direction: function() {
            if (arguments.length === 0) {
              return options.direction;
            }
            else if (arguments.length === 1 && (typeof arguments[0]) == 'string') {
              options.direction = arguments[0];
            }
            return this;
          },
          padding: function() {
            if (arguments.length === 0) {
              return options.padding;
            }
            else if (arguments.length === 1 && (typeof arguments[0]) == 'number') {
              options.padding = arguments[0];
            }
            return this;
          },
          appendAndReturnChild: function(child) {
            this.__doAppendChild(child);

            if (options.direction === 'X') {
              child.translate(this.calcLength(), 0);
            }else {
              child.translate(0, this.calcLength());
            }

            listItems.push(child);
            if (__sizeObj) {
              this.sizeChild(listItems.length - 1, __sizeObj.size());
            }
            return child;
          },
          removeChild: function(child) {
            var id = listItems.indexOf(child);
            if (id >= 0) {
              listItems.remove(id, id);
            }
            this.elem.removeChild(child.elem);
            this.arrangeListItems();
          },
          removeAllChildren: function()
          {
            while (this.elem.firstChild) {
              this.elem.removeChild(this.elem.firstChild);
            }
            listItems = [];
            return this;
          },
          replaceChild: function(oldchild, newchild) {
            var id = listItems.indexOf(oldchild);
            if (id >= 0) {
              listItems[id] = newchild;
            }
            this.elem.replaceChild(oldchild.elem, newchild.elem);
          },
          insertBefore: function(child, position) {
            var id = listItems.indexOf(child);
            if (id >= 0) {
              listItems.remove(id, id);
            }
            id = listItems.indexOf(position);
            if (id >= 0) {
              listItems.splice(id, 0, child);
            }
            this.elem.insertBefore(child.elem, position.elem);
          },
          calcLength: function() {
            var length = options.padding;
            for (var i = 0; i < listItems.length; i++) {
              var size = listItems[i].size();
              length += (options.direction === 'X' ? size.x : size.y) + options.padding;
            }
            return length;
          },
          sizeChild: function(id, size) {
            var child = listItems[id];
            var childsize = child.size();
            if (options.direction === 'X') {
              child.size(childsize.x, size.y - (options.padding * 2.0));
            }else {
              child.size(size.x - (options.padding * 2.0), childsize.y);
            }
          },
          arrangeListItems: function() {
              var length = options.padding;
              for (var i = 0; i < listItems.length; i++) {
                listItems[i].translate(options.padding, length);
                var childSize = listItems[i].size();
                length += (options === 'X' ? childSize.x : childSize.y) + options.padding;
              }
            return this;
          },
          resizeListItems: function() {
            if (__sizeObj) {
              var size = __sizeObj.size();
              for (var i = 0; i < listItems.length; i++) {
                this.sizeChild(i, size, options.padding);
              }
            }
            return this;
          },
          size: function() {
            if (arguments.length === 0) {
              return 0.0;
            }
            var size = arguments[0];
            for (var i = 0; i < listItems.length; i++) {
              this.sizeChild(i, size, options.padding);
            }
            return this;
          },
          getNumItems: function() {
            return listItems.length;
          },
          getItem: function(id) {
            return listItems[id];
          }
        }));
      },
      // MARK: createPath
      createPath: function() {
        return this.appendAndReturnChild(this.extend(this.create('path'), {
          thickness: function() {
            if (arguments.length === 0) {
              return this.attr('stroke-width');
            }
            else if (arguments.length === 1 && (typeof arguments[0]) == 'number') {
              this.attr('stroke-width', arguments[0]);
            }
            return this;
          },
          dropShadow: function(options) {
            options = this.extend({
                offset: FABRIC.RT.vec2(5, 5),
                shadowParent: this
              }, options, false);
          //  var dropShadow = this.createCircle().size(this.size())
          //                                      .radius(this.radius())
          //                                      .addClass("Shadow")
          //                                      .translate(options.offset);
          //  this.parent.insertBefore(dropShadow, this);
          //  this.addOnSizeCallback(function(size){  dropShadow.size(size);});
            return this;
          }
        }));
      },
      // MARK: createButton
      createButton: function(options) {
        options = this.extend({
          text: null,
          checkButton: false,
          multiSelectKey: 0,
          addClasses: true,
          width: 60,
          height: 15
          }, options, false);
        var buttonGroup = this.createGroup().id(options.text).button();

        ///////////////////////////////////
        // Shapes
        var buttonRect = buttonGroup.createRect().width(options.width).height(options.height);
        buttonGroup.sizeObj(buttonRect);

        if (options.text) {
          var textNode = buttonGroup.createText().text(options.text).preventSelection({delegate: this.elem });
          var alignTextToButton = function(size) {
            var pos = size.scale(0.5);
            pos.y += size.y * 0.25; //textNode.fontSize() * 2.5;
            textNode.translate(pos);
          }
          alignTextToButton(buttonRect.size());
          buttonRect.addOnSizeCallback(function(size) { alignTextToButton(size); });
          buttonGroup.getTextNode = function() { return textNode; }
        }
        return buttonGroup;
      },
      // MARK: createNode
      createNode: function(options) {
        options = this.extend({
          text: null,
          color: FABRIC.RT.rgb255(220, 17, 17),
          minWidth: 40,
          pxToText: 6,
          widthPadding: 0,
          height: 25,
          portRadius: 2.5,
          portSize: 15,
          portPadding: 0,
          portYOffset: 17,
          createInPortList: true,
          createOutPortList: true,
          operatorPadding: 2,
          operatorHeight: 14,
          createEditButton: true,
          draggable: true,
          shadow: FABRIC.RT.vec2(3, 3)
        }, options, false);

        var nodeGroup = this.createGroup();
        var nodeWidth = options.widthPadding + Math.max(40, options.text ?
          (options.text.length * options.pxToText) : options.minWidth);
        var nodeHeight = options.height;
        var nodeRect = nodeGroup.createRect()
                                .addClass('Node')
                                .size(nodeWidth, nodeHeight).cornerRadius(3)
                                .color(options.color);
        nodeRect.dropShadow({ offset: options.shadow });
        var nodeTitle;
        if (options.text) {
          nodeTitle = nodeGroup.createText()
                               .preventSelection()
                               .text(options.text)
                               .addClass('NodeLabel')
                               .translate(3, 10);
        }
        if (options.draggable)
          nodeGroup.draggable({highlightObj: nodeRect })
                   .selectable({ highlightObj: nodeRect })
                   .sizeObj(nodeRect);

        ////////////////////////////////////////
        // editButton
        var editButton;
        if (options.createEditButton) {
          editButton = nodeGroup.createRect()
                                .size(8, 8)
                                .cornerRadius(2)
                                .addClass('EditorButton')
                                .translate(nodeWidth - 12, 3)
                                .button();
          nodeGroup.getButton = function() { return editButton; }
        }

        ////////////////////////////////////////
        // Ports
        var inPortList, outPortList, inPort, outPort;

        var resizeNodeHeight = function() {
          var currHeight = nodeRect.height();
          var newHeight = options.portYOffset + ((Math.max(inPortList ? inPortList.getNumItems() : 1,
            outPortList ? outPortList.getNumItems() : 1) - 0.5) * options.portSize);
          nodeRect.height(newHeight);
        }
        var resizeNodeWidth = function() {
          var currWidth = nodeRect.width();
          var newWidth = options.widthPadding + Math.max(40, options.text ?
            (options.text.length * options.pxToText) : options.minWidth);
          nodeRect.width(newWidth);
          if (outPortList) {
            outPortList.translate(newWidth, options.portYOffset);
          }else if (outPort) {
            outPort.translate(newWidth, options.portYOffset);
          }
          if (editButton) {
            editButton.translate(newWidth - 12, 3);
          }
        }

        if (options.createInPortList) {
          inPortList = nodeGroup.createList({padding: options.portPadding})
                                .id('inPortList')
                                .translate(0 , options.portYOffset);
        }
        if (options.createOutPortList) {
          outPortList = nodeGroup.createList({padding: options.portPadding})
                                 .id('outPortList')
                                 .translate(nodeWidth, options.portYOffset);
        }
        nodeGroup.addPort = function(portoptions) {
          portoptions.height = options.portSize;
          portoptions.ownerNode = nodeGroup;
          return nodeGroup.createPort(portoptions);
        };
        nodeGroup.addInPort = function(portoptions) {
          portoptions.height = options.portSize;
          portoptions.direction = 'Target';
          portoptions.labelEventCatcherWidth = nodeWidth * 0.5;
          portoptions.ownerNode = nodeGroup;
          inPort = (inPortList ? inPortList : nodeGroup).createPort(portoptions);
          if (inPortList) {
            resizeNodeHeight();
          }else {
            inPort.translate(0 , options.portYOffset);
          }
          return inPort;
        };
        nodeGroup.addOutPort = function(portoptions) {
          portoptions.height = options.portSize;
          portoptions.direction = 'Source';
          portoptions.labelEventCatcherWidth = nodeWidth * 0.5;
          portoptions.ownerNode = nodeGroup;
          outPort = (outPortList ? outPortList : nodeGroup).createPort(portoptions);
          if (outPortList) {
            resizeNodeHeight();
          }else {
            outPort.translate(nodeWidth, options.portYOffset);
          }
          return outPort;
        };
        nodeGroup.getInPort = function(portid) {
          return (inPortList ? inPortList.getItem(portid) : inPort);
        };
        nodeGroup.getOutPort = function(portid) {
          return (outPortList ? outPortList.getItem(portid) : outPort);
        };
        nodeGroup.removeInPort = function(port) {
          if (inPortList) {
            inPortList.removeChild(port);
            resizeNodeHeight();
          }
          else port.destroy();
        };
        nodeGroup.removeAllInPorts = function() {
          if (inPortList) inPortList.removeAllChildren();
        };
        nodeGroup.removeAllOutPorts = function() {
          if (outPortList) outPortList.removeAllChildren();
        };
        nodeGroup.removeAllPorts = function() {
          this.removeAllInPorts();
          this.removeAllOutPorts();
        };
        nodeGroup.setColor = function(color) {
          nodeRect.color(color);
          options.color = color;
        };
        nodeGroup.setTitle = function(text) {
          nodeTitle.text(text);
          options.text = text;
          resizeNodeWidth();
        };
        nodeGroup.getSize = function() {
          return FABRIC.RT.vec2(nodeWidth, nodeHeight);
        };


        ///////////////////////////
        // Operator Lists
        var operatorListGroup = nodeGroup.createGroup().translate(10 , nodeRect.height());
        nodeRect.addOnSizeCallback(function(size) { operatorListGroup.translate(10 , size.y); });
        var operatorList = operatorListGroup.createList({padding: options.operatorPadding}).id('operatorList');

        var numOperators = 0;
        nodeGroup.addOperator = function(operatorOptions) {
          operatorOptions = this.extend({
            text: null,
            color: FABRIC.RT.rgb255(220, 17, 17),
            minWidth: 40,
            pxToText: 5,
            createButton: true
          }, operatorOptions, false);

          numOperators += 1;

          var operatorWidth = Math.max(40, operatorOptions.text ?
            (operatorOptions.text.length * operatorOptions.pxToText) : operatorOptions.minWidth) + 10;
          var operatorGroup = operatorList.createGroup().height(options.operatorHeight);

          var operatorRect = operatorGroup.createRect()
                                          .addClass('Operator')
                                          .size(operatorWidth, options.operatorHeight)
                                          .cornerRadius(options.operatorHeight * 0.4)
                                          .color(operatorOptions.color);
                                          //.dropShadow({ offset:FABRIC.RT.vec2(3,3) });
          operatorGroup.createText()
                       .preventSelection()
                       .text(operatorOptions.text)
                       .addClass('PortLabel')
                       .translate(3, 10);

          // Create the 'Edit Operator' button
          if (operatorOptions.createButton) {
            var button = operatorGroup.createRect()
                                      .size(8, 8)
                                      .cornerRadius(2)
                                      .addClass('EditorButton')
                                      .translate(operatorWidth - 10, 2)
                                      .button();
            operatorGroup.getButton = function() { return button; }
          }
          operatorGroup.setColor = function(color) {
            operatorRect.color(color);
          };
          return operatorGroup;
        };

        nodeGroup.removeOperators = function() {
          operatorList.removeAllChildren();
        }

        if (options.draggable)
          nodeGroup.addOnDragBeginCallback(function(evt) { nodeGroup.moveToTop(); });
        return nodeGroup;

      },
      // MARK: createPort
      createPort: function(options) {
        options = this.extend({
          text: null,
          color: FABRIC.RT.rgb255(170, 170, 170),
          direction: 'Target',
          height: 20,
          portRadius: 2.5,
          portLabelPaddingX: 5,
          portLabelPaddingY: 3,
          createLabelEventCatcher: true,
          labelEventCatcherWidth: 50,
          ownerNode: null,
          portDataType: null,
          connectable: true,
          allowMultipleConnections: true
          //   dragEventSender:null
        }, options, false);


        var portGroup = this.createGroup().typeName('PortGroup');
        if (options.text) {
          portGroup.createText()
                   .preventSelection()
                   .text(options.text)
                   .anchor(options.direction === 'Target' ? 'start' : 'end')
                   .addClass('PortLabel')
                   .translate(options.portLabelPaddingX * ((options.direction === 'Target') ? 1 : -1),
                              options.portLabelPaddingY);
        }
        var portCircle = portGroup.createCircle()
                                  .addClass('DFGNodePort')
                                  .color(options.color)
                                  .radius(options.portRadius);

        if (options.createLabelEventCatcher) {
          portGroup.createRect()
                   .eventCatcher()
                   .size(options.labelEventCatcherWidth, options.height)
                   .translate((options.direction == 'Target') ? 0 : -options.labelEventCatcherWidth,
                              options.height * -0.5).typeName('PortLabelEventCatcher');
        }
        var portCircleEventCatcher = portGroup.createCircle()
                                              .eventCatcher()
                                              .radius(options.height * 0.5)
                                              .typeName('PortEventCatcher');
        portGroup.sizeObj(portCircleEventCatcher)
            .highlight(
              {
                highlightObj: portCircle
              })
            .addOnHighlightCallback(function() { portCircle.radius(options.portRadius + 0.75); })
            .addOnUnHighlightCallback(function() { portCircle.radius(options.portRadius); });

        portCircleEventCatcher.highlight(
              {
                setClasses: false,
                setCursor: true,
                cursor: 'crosshair'
              });

        portGroup.dataType = function() {
          if (arguments.length === 0) {
            return options.portDataType;
          }
          else if (arguments.length === 1) {
            options.portDataType = arguments[0];
          }
          return this;
        }
        portGroup.getDirection = function() {
          return options.direction;
        }
        portGroup.getOwnerNode = function() {
          return options.ownerNode;
        }


        if (options.connectionDirection == undefined) {
          if (options.direction === 'Target') {
            options.connectionDirection = 'Left';
          }else {
            options.connectionDirection = 'Right';
          }
        }
        portGroup.getConnectionDirection = function() {
          return options.connectionDirection;
        }
        var connections = [];

        ///////////////////////////////////
        // Callbacks
        // canConnectCallbacks
        var canConnectCallbacks = [];
        portGroup.addCanConnectCallback = function(cb) {
          canConnectCallbacks.push(cb);
          return this;
        };
        portGroup.removeCanConnectCallback = function(cb) {
          var id = canConnectCallbacks.indexOf(cb);
          if (id !== -1) {
            canConnectCallbacks.remove(id, id);
          }
          return this;
        };
        var fireCanConnectCallbacks = function(connectionPort) {
          var result = true;
          for (var i = 0; i < canConnectCallbacks.length; i++) {
            result &= canConnectCallbacks[i].call(portGroup, connectionPort);
          }
          return result;
        };

        // onConnectCallbacks
        var onConnectCallbacks = [];
        portGroup.addOnConnectCallback = function(cb) {
          onConnectCallbacks.push(cb);
          return this;
        };
        portGroup.removeOnConnectCallback = function(cb) {
          var id = onConnectCallbacks.indexOf(cb);
          if (id !== -1) {
            onConnectCallbacks.remove(id, id);
          }
          return this;
        };
        var fireOnConnectCallbacks = function(connectedPort) {
          for (var i = 0; i < onConnectCallbacks.length; i++) {
            onConnectCallbacks[i].call(portGroup, connectedPort);
          }
        };

        // onDisconnectCallbacks
        var onDisconnectCallbacks = [];
        portGroup.addOnDisconnectCallback = function(cb) {
          onDisconnectCallbacks.push(cb);
          return this;
        };
        portGroup.removeOnDisconnectCallback = function(cb) {
          var id = onDisconnectCallbacks.indexOf(cb);
          if (id !== -1) {
            onDisconnectCallbacks.remove(id, id);
          }
          return this;
        };
        var fireOnDisconnectCallbacks = function(connection) {
          for (var i = 0; i < onDisconnectCallbacks.length; i++) {
            onDisconnectCallbacks[i].call(portGroup, connection);
          }
        };

        ///////////////////////////////////
        // Connections
        // Storing these members on the svgRoot is a bit of a hack.
        // TODO: Figure out how to avoid this.
        var graphHolderGroup = this.svgRoot.graphHolderGroup;
        var edgeHolderGroup = this.svgRoot.edgeHolderGroup;
        var nodeHolderGroup = this.svgRoot.nodeHolderGroup;
        var svgRoot = this.svgRoot;
        var connectionPortGroup = null;

        portGroup.canConnect = function(connectionPort) {
          return (options.direction !== connectionPort.getDirection() &&
                  options.portDataType === connectionPort.dataType() &&
                  fireCanConnectCallbacks(connectionPort));
        }

        portGroup.addConnection = function(connection, connectionOptions) {
          connectionOptions = this.extend({
            fireCallbacks: true
          }, connectionOptions, false);

          // only disconnect for target ports
          if (options.direction === 'Target') {
            if (!options.allowMultipleConnections) {
              portGroup.deleteConnection(connections[0]);
            }
          }
          connections.push(connection);
          if (connectionOptions.fireCallbacks) {
            if (options.direction === 'Target') {
              fireOnConnectCallbacks(connection.getSourcePort());
            }else {
              fireOnConnectCallbacks(connection.getTargetPort());
            }
          }
          return this;
        }
        portGroup.removeConnection = function(c) {
          var connectionID = connections.indexOf(c);
          if (connectionID !== -1) {
            connections.splice(connectionID, 1);
          }
          return this;
        };

        // Destroy the connection which will disconnect its self from this port
        portGroup.deleteConnection = function(connection) {
          connection = connection ? connection : connections[0];
          var connectionID = connections.indexOf(connection);
          if (connectionID != -1) {
            connection.destroy();
          }
        }

        // Disconnect the connection from this port, but don't delete it.
        portGroup.disconnect = function(connection, disonnectionOptions) {
          disonnectionOptions = this.extend({
            fireCallbacks: true
          }, disonnectionOptions, false);

          connection = connection ? connection : connections[0];
          var connectionID = connections.indexOf(connection);
          if (connectionID != -1) {
            connections.splice(connectionID, 1);
          }
          if (disonnectionOptions.fireCallbacks) {
            if (options.direction === 'Target') {
              if (connection.getSourcePort()) {
                fireOnDisconnectCallbacks(connection.getSourcePort());
              }
            }else {
              if (connection.getTargetPort()) {
                fireOnDisconnectCallbacks(connection.getTargetPort());
              }
            }
          }
        }

        portGroup.connectTo = function(targetPort, portConnectionOptions) {
          portConnectionOptions = this.extend({
            fireCallbacks: true,
            connectable: true
          }, portConnectionOptions, false);

          var connector;
          if (options.portDataType === targetPort.dataType()) {
            if (options.direction === 'Target') {
              connector = edgeHolderGroup.createConnector({
                sourcePort: targetPort,
                sourcePortOwner: targetPort.getOwnerNode(),
                targetPort: portGroup,
                targetPortOwner: options.ownerNode,
                connectable: options.connectable,
                wrt: nodeHolderGroup,
                color: options.color
              });
            }else {
              connector = edgeHolderGroup.createConnector({
                sourcePort: portGroup,
                sourcePortOwner: options.ownerNode,
                targetPort: targetPort,
                targetPortOwner: targetPort.getOwnerNode(),
                wrt: nodeHolderGroup,
                connectable: options.connectable,
                color: options.color
              });
            }
            this.addConnection(connector, portConnectionOptions);
            targetPort.addConnection(connector, portConnectionOptions);
          }
          return connector;
        };

        var portGroupMouseDownFn = function(evt) {
          if (evt.target === portCircleEventCatcher.elem) {
            if (!options.allowMultipleConnections) {
              portGroup.deleteConnection();
            }
            var connector;
            if (options.direction === 'Target') {
              connector = edgeHolderGroup.createConnector({
                targetPort: portGroup,
                targetPortOwner: options.ownerNode,
                wrt: nodeHolderGroup,
                color: options.color
              });
              connector.setSourcePos(graphHolderGroup.screenToLocalPos(
                FABRIC.RT.vec2(evt.offsetX, evt.offsetY)));
            }else {
              connector = edgeHolderGroup.createConnector({
                sourcePort: portGroup,
                sourcePortOwner: options.ownerNode,
                wrt: nodeHolderGroup,
                color: options.color
              });
              connector.setTargetPos(graphHolderGroup.screenToLocalPos(
                FABRIC.RT.vec2(evt.offsetX, evt.offsetY)));
            }
            evt.preventDefault();
            evt.stopPropagation();
          }
        };
        if (options.connectable)
          portGroup.elem.addEventListener('mousedown', portGroupMouseDownFn, false);
        return portGroup;
      },
      // MARK: createConnector
      createConnector: function(options) {
        options = this.extend({
          sourcePort: null,
          sourcePortOwner: null,
          targetPort: null,
          targetPortOwner: null,
          connectable: true,
          wrt: null,
          color: FABRIC.RT.rgb(0.9, 0.7, 0.5)
          }, options, false);

        if (!options.sourcePort && !options.targetPort) {
          console.error(' Error creating connection: a source or target port must be specified');
        }

        var sourcePos, targetPos;
        var connectorGroup = this.createGroup();
        var lineBorder = connectorGroup.createPath().addClass('LineBorder');
        var line = connectorGroup.createPath().addClass('LineCore').stroke(options.color);
        var lineEventCatcher = connectorGroup.createPath().addClass('EventCatcher');

        sourcePos = targetPos = FABRIC.RT.vec2();
        var sourceDirection, targetDirection;
        var calcSourceConnectionDirection = function() {
          if (options.sourcePort) {
            switch (options.sourcePort.getConnectionDirection()) {
              case 'Right': sourceDirection = FABRIC.RT.vec2(1, 0); break;
              case 'Left': sourceDirection = FABRIC.RT.vec2(-1, 0); break;
              case 'Up': sourceDirection = FABRIC.RT.vec2(0, -1); break;
              case 'Down': sourceDirection = FABRIC.RT.vec2(0, 1); break;
            }
          }else {
            sourceDirection = FABRIC.RT.vec2(1, 0);
          }
        }
        var calcTargetConnectionDirection = function() {
          if (options.targetPort) {
            switch (options.targetPort.getConnectionDirection()) {
              case 'Right': targetDirection = FABRIC.RT.vec2(1, 0); break;
              case 'Left': targetDirection = FABRIC.RT.vec2(-1, 0); break;
              case 'Up': targetDirection = FABRIC.RT.vec2(0, -1); break;
              case 'Down': targetDirection = FABRIC.RT.vec2(0, 1); break;
            }
          }else {
            targetDirection = FABRIC.RT.vec2(-1, 0);
          }
        }

        var updatePaths = function(evt) {
          var p1, p2, p3, p4;
          p1 = sourcePos;
          p4 = targetPos;
          if (targetPos.subtract(sourcePos).dot(sourceDirection) > 0) {
            p2 = p1.add(sourceDirection.scale(p4.subtract(p1).dot(sourceDirection) * 0.3));
          }
          else {
            p2 = p1.add(sourceDirection.scale(p4.subtract(p1).dot(sourceDirection) * -0.3));
          }
          if (targetPos.subtract(sourcePos).dot(targetDirection) < 0) {
            p3 = p4.add(targetDirection.scale(p1.subtract(p4).dot(targetDirection) * 0.3));
          }
          else {
            p3 = p4.add(targetDirection.scale(p1.subtract(p4).dot(targetDirection) * -0.3));
          }
          var path = ['M', p1.x.toFixed(3), p1.y.toFixed(3), 'C',
                      p2.x, p2.y, p3.x, p3.y, p4.x.toFixed(3), p4.y.toFixed(3)].join(' ');
          lineBorder.attr('d', path);
          line.attr('d', path);
          lineEventCatcher.attr('d', path);
        };

        if (options.sourcePortOwner && options.sourcePortOwner.addOnDragCallback) {
          options.sourcePortOwner.addOnDragCallback(function(e) {
            sourcePos = options.sourcePort.localPos(options.wrt);
            updatePaths();
          });
        }
        if (options.targetPortOwner && options.targetPortOwner.addOnDragCallback) {
          options.targetPortOwner.addOnDragCallback(function(e) {
            targetPos = options.targetPort.localPos(options.wrt);
            updatePaths();
          });
        }

        calcSourceConnectionDirection();
        calcTargetConnectionDirection();


        connectorGroup.highlight(
          {
            setCursor: false,
            highlightObj: lineBorder
          });

        var graphHolderGroup = this.svgRoot.graphHolderGroup;
        var svgRoot = this.svgRoot;

        if (options.connectable)
        {
          connectorGroup.elem.addEventListener('mousedown',
            function(evt) {
              var mouseDownPos = graphHolderGroup.screenToLocalPos(FABRIC.RT.vec2(evt.offsetX, evt.offsetY));
              var connectorVec = targetPos.subtract(sourcePos);
              connectorVec.normalize();
              var mouseMoveFn = function(evt) {
                var mousePos = graphHolderGroup.screenToLocalPos(FABRIC.RT.vec2(evt.offsetX, evt.offsetY));
                var dragDist = mousePos.subtract(mouseDownPos).dot(connectorVec);
                if (dragDist > 3) {
                  bindSourceToMouseFn();
                  connectorGroup.elem.removeEventListener('mousemove', mouseMoveFn, false);
                  connectorGroup.elem.removeEventListener('mouseup', mouseUpFn, false);
                }
                if (dragDist < -3) {
                  bindTargetToMouseFn();
                  connectorGroup.elem.removeEventListener('mousemove', mouseMoveFn, false);
                  connectorGroup.elem.removeEventListener('mouseup', mouseUpFn, false);
                }
              }
              var mouseUpFn = function(evt) {
                connectorGroup.elem.removeEventListener('mousemove', mouseMoveFn, false);
              }
              connectorGroup.elem.addEventListener('mousemove', mouseMoveFn, false);
              connectorGroup.elem.addEventListener('mouseup', mouseUpFn, false);
            }, false);
        }

        var setSourcePort = function(sourcePort, sourcePortOwner) {
          var onDragFn = function(e) {
            connectorGroup.setSourcePos(options.sourcePort.localPos(options.wrt));
          }
          if (options.sourcePort) {
            options.sourcePort.disconnect(connectorGroup);
            if (options.sourcePortOwner && options.sourcePortOwner.addOnDragCallback) {
              options.sourcePortOwner.addOnDragCallback(onDragFn);
            }
          }
          options.sourcePort = sourcePort;
          options.sourcePortOwner = sourcePortOwner;
          if (options.sourcePort && options.sourcePortOwner) {
            if (options.sourcePortOwner.addOnDragCallback) {
              options.sourcePortOwner.addOnDragCallback(onDragFn);
            }
            updateSourcePos();
            calcSourceConnectionDirection();
          }
        };
        var setTargetPort = function(targetPort, targetPortOwner) {
          var onDragFn = function(e) {
            connectorGroup.setTargetPos(options.targetPort.localPos(options.wrt));
          }
          if (options.targetPort) {
            options.targetPort.disconnect(connectorGroup);
            if (options.targetPortOwner && options.targetPortOwner.removeOnDragCallback) {
              options.targetPortOwner.removeOnDragCallback(onDragFn);
            }
          }
          options.targetPort = targetPort;
          options.targetPortOwner = targetPortOwner;
          if (options.targetPort && options.targetPortOwner) {
            if (options.targetPortOwner.addOnDragCallback) {
              options.targetPortOwner.addOnDragCallback(onDragFn);
            }
            updateTargetPos();
            calcTargetConnectionDirection();
          }
        };

        var bindSourceToMouseFn = function() {
          setSourcePort(null, null);
          // Now we bind the end of the connector to the mouse.
          connectorGroup.svgRoot.state = 'ConnectingPort';
          var connectionPortGroup;
          var mouseMoveFn = function(evt) {
            if (!connectionPortGroup) {
              connectorGroup.setSourcePos(graphHolderGroup.screenToLocalPos(
                FABRIC.RT.vec2(evt.offsetX, evt.offsetY)));
            }
          };
          var mouseOverFn = function(evt) {
            if (evt.target.obj &&
                (evt.target.obj.typeName() === 'PortEventCatcher' ||
                 evt.target.obj.typeName() === 'PortLabelEventCatcher')) {
              var posibleConnectionPortGroup = evt.target.obj.parent;
              if (options.targetPort.canConnect(posibleConnectionPortGroup)) {
                connectionPortGroup = posibleConnectionPortGroup;
                connectorGroup.setSourcePos(connectionPortGroup.localPos(graphHolderGroup));
              }
            }
          };
          var mouseOutFn = function(evt) {
            if (evt.target.obj.parent == connectionPortGroup) {
              connectionPortGroup = null;
            }
          };
          var mouseUpFn = function(evt) {
            if (connectionPortGroup) {
              setSourcePort(connectionPortGroup, connectionPortGroup.getOwnerNode());
              connectionPortGroup.addConnection(connectorGroup);
              options.targetPort.addConnection(connectorGroup);
            }else {
              connectorGroup.destroy();
              return;
            }
            connectorGroup.svgRoot.state = 'Normal';
            svgRoot.elem.removeEventListener('mousemove', mouseMoveFn, false);
            svgRoot.elem.removeEventListener('mouseover', mouseOverFn, false);
            svgRoot.elem.removeEventListener('mouseout', mouseOutFn, false);
            svgRoot.elem.removeEventListener('mouseup', mouseUpFn, false);
          };
          if (options.connectable)
          {
            svgRoot.elem.addEventListener('mousemove', mouseMoveFn, false);
            svgRoot.elem.addEventListener('mouseover', mouseOverFn, false);
            svgRoot.elem.addEventListener('mouseout', mouseOutFn, false);
            svgRoot.elem.addEventListener('mouseup', mouseUpFn, false);
          }
        }
        var bindTargetToMouseFn = function() {
          setTargetPort(null, null);
          // Now we bind the end of the connector to the mouse.
          connectorGroup.svgRoot.state = 'ConnectingPort';
          var connectionPortGroup;
          var mouseMoveFn = function(evt) {
            if (!connectionPortGroup) {
              connectorGroup.setTargetPos(graphHolderGroup.screenToLocalPos(
                FABRIC.RT.vec2(evt.offsetX, evt.offsetY)));
            }
          };
          var mouseOverFn = function(evt) {
            if (evt.target.obj &&
                (evt.target.obj.typeName() === 'PortEventCatcher' ||
                 evt.target.obj.typeName() === 'PortLabelEventCatcher')) {
              var posibleConnectionPortGroup = evt.target.obj.parent;
              if (options.sourcePort.canConnect(posibleConnectionPortGroup)) {
                connectionPortGroup = posibleConnectionPortGroup;
                connectorGroup.setTargetPos(connectionPortGroup.localPos(graphHolderGroup));
              }
            }
          };
          var mouseOutFn = function(evt) {
            if (evt.target.obj.parent == connectionPortGroup) {
              connectionPortGroup = null;
            }
          };
          var mouseUpFn = function(evt) {
            if (connectionPortGroup) {
              setTargetPort(connectionPortGroup, connectionPortGroup.getOwnerNode());
              connectionPortGroup.addConnection(connectorGroup);
              options.sourcePort.addConnection(connectorGroup);
            }else {
              connectorGroup.destroy();
              return;
            }
            connectorGroup.svgRoot.state = 'Normal';
            svgRoot.elem.removeEventListener('mousemove', mouseMoveFn, false);
            svgRoot.elem.removeEventListener('mouseover', mouseOverFn, false);
            svgRoot.elem.removeEventListener('mouseout', mouseOutFn, false);
            svgRoot.elem.removeEventListener('mouseup', mouseUpFn, false);
          };
          if (options.connectable)
          {
            svgRoot.elem.addEventListener('mousemove', mouseMoveFn, false);
            svgRoot.elem.addEventListener('mouseover', mouseOverFn, false);
            svgRoot.elem.addEventListener('mouseout', mouseOutFn, false);
            svgRoot.elem.addEventListener('mouseup', mouseUpFn, false);
          }
        }

        connectorGroup.getSourcePort = function() { return options.sourcePort; }
        connectorGroup.getTargetPort = function() { return options.targetPort; }
        connectorGroup.setSourcePos = function(pos) { sourcePos = pos; updatePaths(); };
        connectorGroup.setTargetPos = function(pos) { targetPos = pos; updatePaths(); };
        var updateSourcePos = function() {
          if (options.sourcePort) {
            sourcePos = options.sourcePort.localPos(options.wrt); updatePaths();
          }
        };
        var updateTargetPos = function() {
          if (options.targetPort) {
            targetPos = options.targetPort.localPos(options.wrt); updatePaths();
          }
        };

        connectorGroup.destroy = function() {
          if (options.sourcePort) { options.sourcePort.disconnect(connectorGroup); }
          if (options.targetPort) { options.targetPort.disconnect(connectorGroup); }
          if (this.parent) {
            // check if we really have this parent
            for (var i = 0; i < this.parent.elem.childNodes.length; i++) {
              if (this.parent.elem.childNodes[i] == this.elem) {
                this.parent.elem.removeChild(this.elem);
                break;
              }
            }
          }
        }

        if (options.sourcePort) {
          sourcePos = options.sourcePort.localPos(options.wrt);
        }else {
          bindSourceToMouseFn();
        }
        if (options.targetPort) {
          targetPos = options.targetPort.localPos(options.wrt);
        }
        else {
          bindTargetToMouseFn();
        }
        updatePaths();

        return connectorGroup;
      }
    }
  };

  var svgRoot = new SVGFactory('svg');
  document.getElementById(domRootID).appendChild(svgRoot.elem);
  return svgRoot;
};
