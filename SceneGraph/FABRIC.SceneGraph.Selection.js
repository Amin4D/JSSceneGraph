

//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//

/**
 * The rselection manager provides selection functionality to the scene graph.
 * additional rendering pipeline and capabilities.
 */
FABRIC.SceneGraph.registerManagerType('SelectionManager', {
  briefDesc: 'The SelectionManager manages selections of objects.',
  detailedDesc: '.',
  parentManagerDesc: '',
  optionsDesc: {
  },
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
      });

    var selection = [];
    var listeners = [];
    
    var selectionManager = {
      pub:{
        isSelected:function( obj ){ 
          return selection.indexOf(obj) != -1;
        },
        select:function( obj ){
          this.clearSelection(false);
          if(obj.constructor.name == 'Array'){
            for(var i=0; i<obj.length; i++){
              this.addToSelection(obj[i], false);
            }
            selectionManager.pub.fireEvent('selectionChanged', { selection:selection });
          }
          else{
            if(!this.isSelected(obj)){ 
              this.addToSelection(obj);
            }
          }
        },
        addToSelection:function(obj, fireevents){
          if(selection.indexOf(obj)!=-1)
            return;
          selection.push(obj);
          if(obj.fireEvent){
            obj.fireEvent('selected');
          }
          if(fireevents!=false){
            selectionManager.pub.fireEvent('selectionChanged', { selection:selection });
          }
        },
        removeFromSelection:function( obj, firevents ){ 
          if(selection.length == 0)
            return;
          var id = selection.indexOf(obj);
          if(id != -1){
            // Put the color back. 
            if(obj.fireEvent){
              obj.fireEvent('deselected');
            }
            // Remove from the seleciton array.
            if( selection.length == 1 ){
              selection = []
            }else{
              selection.splice(id,1);
            }
          }
          if(firevents!=false){
            selectionManager.pub.fireEvent('selectionChanged', { selection:selection });
          }
        },
        clearSelection:function(firevents){ 
          if(selection.length > 0){
            for (var i = selection.length-1; i >=0 ; i--) {
              this.removeFromSelection(selection[i], false);
            }
          }
          if(firevents!=false){
            selectionManager.pub.fireEvent('selectionChanged', { selection:selection });
          }
        },
        getSelection: function(){
          return selection;
        },
        addListener: function(listener){
          if(!listener.fireEvent){
            throw "listener must support events";
          }
          listeners.push(listener);
        }
      }
    }
    scene.addEventHandlingFunctions(selectionManager);
    
    return selectionManager;
  }});



FABRIC.SceneGraph.registerManagerType('ViewportSelectionManager', {
  briefDesc: 'The ViewportSelectorManager manages selections of objects view mouse events from the viewport.',
  detailedDesc: '.',
  parentManagerDesc: '',
  optionsDesc: {
  },
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
      addToSelectionKeyName: 'ctrlKey',
      removeFromSelectionKeyName: 'altKey'
    });
    
    var selectionManager = scene.constructManager('SelectionManager', options);
    
    scene.pub.addEventListener('mouseover_geom', function(evt){
      if(evt.targetNode.fireEvent){
        evt.targetNode.fireEvent('highlight');
        scene.pub.redrawAllViewports();
      }
    });
    scene.pub.addEventListener('mouseout_geom', function(evt){
      if(evt.targetNode.fireEvent){
        evt.targetNode.fireEvent('unhighlight');
        scene.pub.redrawAllViewports();
      }
    });
    scene.pub.addEventListener('mousedown_geom', function(evt){
      if(evt[options.addToSelectionKeyName]){
        selectionManager.pub.addToSelection(evt.targetNode);
      }else if(evt[options.removeFromSelectionKeyName]){
        selectionManager.pub.removeFromSelection(evt.targetNode);
      }else{
        selectionManager.pub.select(evt.targetNode);
        evt.stopPropagation();
        scene.pub.redrawAllViewports();
      }
    });
    var mouseDownScreenPos;
    scene.pub.addEventListener('mousedown', function(evt){
      if(!evt.targetNode){
        mouseDownScreenPos = evt.mouseScreenPos;
      }
    });
    scene.pub.addEventListener('mouseup', function(evt){
      if(mouseDownScreenPos && evt.mouseScreenPos.subtract(mouseDownScreenPos).length() < 0.01){
        selectionManager.pub.clearSelection();
        scene.pub.redrawAllViewports();
        mouseDownScreenPos = undefined;
      }
    });
    
    return selectionManager;
  }});


/**
 * The rselection manager provides selection functionality to the scene graph.
 * additional rendering pipeline and capabilities.
 */
FABRIC.SceneGraph.registerManagerType('SelectionManipulationManager', {
  briefDesc: 'The SelectionManipulationManager manages manipulatoin of selected of objects.',
  detailedDesc: '.',
  parentManagerDesc: '',
  optionsDesc: {
  },
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
      selectionManager: undefined,
      rotationManipulators: [],
      translationManipulators: []
      });
    var rotationManipulators = options.rotationManipulators;
    var translationManipulators = options.translationManipulators;
    var toggleRotatonManipulatorsDisplay = function(drawToggle){
      for(var i=0; i<rotationManipulators.length; i++){
        rotationManipulators[i].setDrawToggle(drawToggle);
      }
    }
    var toggleTranslationManipulatorsDisplay = function(drawToggle){
      for(var i=0; i<translationManipulators.length; i++){
        translationManipulators[i].setDrawToggle(drawToggle);
      }
    }
    // Construct a 'Transform' node that is used as the parent of the Maipulators.
    // This transform node aligns its self with the average of the selected objects.
    // an event is fired on the node when it is manipulated, and it uses this
    // event to manipulate all the selected objects.
    var groupTransform = scene.constructNode('Transform', {
      name: 'SelectionManipulationManagerGroupTransform',
      hierarchical: false
    } );
    
    
    var selectionManager = options.selectionManager;
    var operatorAssigned = false;
    var generatedOperators = {};
    var generateTransformOperator = function(selection){
      if(generatedOperators[selection.length]){
        return generatedOperators[selection.length];
      }
      var parameterLayout = [
        'self.globalXfo'
      ]
      var srcCodeHeader = 'use Xfo, Mat44;\noperator calcAverageXfo( \n  io Xfo xfo';
      var srcCodeBody = '\n){ \n  xfo.setIdentity();\n  Scalar weight = 1.0/'+selection.length+'.0;\n';
      for(var i=0; i<selection.length; i++){
        srcCodeHeader += ',\n  io Xfo obj' + i;
        srcCodeBody  += '  xfo.tr += obj' + i + '.tr * weight;\n';
        srcCodeBody  += '  xfo.ori += obj' + i + '.ori * weight;\n';
        parameterLayout.push('obj' + i +'.globalXfo');
      }
      srcCodeBody += '  xfo.ori.setUnit(); \n}';
      
      var operatorName = 'calcAverageXfo' + selection.length;
      generatedOperators[selection.length] = scene.constructOperator( {
          operatorName: operatorName,
          srcCode: (srcCodeHeader + srcCodeBody),
          parameterLayout: parameterLayout,
          entryFunctionName: 'calcAverageXfo',
          async: false
        });
      
      return generatedOperators[selection.length];
    }
    var prevSelectionCount = 0;
    selectionManager.addEventListener('selectionChanged', function(evt){
      if(operatorAssigned){
        groupTransform.getDGNode().bindings.remove(0);
        operatorAssigned = false;
      }
      if(evt.selection.length==0){
        toggleRotatonManipulatorsDisplay(false);
        toggleTranslationManipulatorsDisplay(false);
      }
      else{
        toggleRotatonManipulatorsDisplay(true);
        toggleTranslationManipulatorsDisplay(true);
        
        for(var i=0; i<evt.selection.length; i++){
          var obj = scene.getPrivateInterface(evt.selection[i].getTransformNode());
          groupTransform.getDGNode().setDependency(obj.getDGNode(), 'obj'+i);
        }
        for(var i=evt.selection.length; i<prevSelectionCount; i++){
          // TODO: uncomment this once we have removeDependency
        //  groupTransform.getDGNode().removeDependency('obj'+i);
        }
        groupTransform.getDGNode().bindings.append(generateTransformOperator(evt.selection));
        prevSelectionCount = evt.selection.length;
        operatorAssigned = true;
      }
    });
    
    /////
    // Propagate the manipulation to all selected members.
    var dragStartGlobalXfo, dragStartSelGlobalXfos = [];
    var dragStartFn = function(evt) {
      dragStartGlobalXfo = groupTransform.pub.getGlobalXfo();//.inverse();
      var selection = selectionManager.getSelection();
      dragStartSelGlobalXfos = [];
      for(var i=0; i<selection.length; i++){
        dragStartSelGlobalXfos.push(selection[i].getTransformNode().getGlobalXfo());
      }
    }
    var dragFn = function(evt) {
      
    }
    groupTransform.pub.setGlobalXfo = function(xfo){
      var xform = xfo.multiply(dragStartGlobalXfo.inverse());
      var selection = selectionManager.getSelection();
      for(var i=0; i<selection.length; i++){
        selection[i].getTransformNode().setGlobalXfo( xform.multiply(dragStartSelGlobalXfos[i]) );
      }
    };
    
    if(rotationManipulators.length == 0){
      var rotManip = scene.pub.constructNode('RotationManipulator', {
          name: options.name + 'RotateYaxisManipulator',
          color: FABRIC.RT.rgb(0, 0.8, 0, 1),
          radius: 8,
          parentNode: groupTransform.pub,
          drawToggle: false
        });
      rotManip.addEventListener('dragstart', dragStartFn);
      rotManip.addEventListener('drag', dragFn);
      rotationManipulators.push(rotManip);
    }
    if(translationManipulators.length == 0){
      var transManip1 = scene.pub.constructNode('LinearTranslationManipulator', {
          name: options.name + 'TranslateYaxisManipulator',
          color: FABRIC.RT.rgb(0, 0.8, 0),
          size: 16,
          parentNode: groupTransform.pub,
          drawToggle: false,
          drawOverlaid: true
        });
      transManip1.addEventListener('dragstart', dragStartFn);
      transManip1.addEventListener('drag', dragFn);
      translationManipulators.push(transManip1);
      
      var transManip2 = scene.pub.constructNode('ScreenTranslationManipulator', {
          name: options.name + 'ScreenTranslationManipulator',
          color: FABRIC.RT.rgb(0, 0.8, 0, 1),
          parentNode: groupTransform.pub,
          geometryNode: scene.pub.constructNode('Sphere', {radius: 2.0, detail: 8.0}),
          drawToggle: false,
          drawOverlaid: true
        });
      transManip2.addEventListener('dragstart', dragStartFn);
      transManip2.addEventListener('drag', dragFn);
      translationManipulators.push(transManip2);
    }
    
    var selectionManipulationManager = {
      pub:{
        setMode: function(mode){
          switch(mode){
          case 0:
            toggleRotatonManipulatorsDisplay(false);
            toggleTranslationManipulatorsDisplay(false);
            break
          case 1:
            toggleRotatonManipulatorsDisplay(true);
            toggleTranslationManipulatorsDisplay(false);
            break
          case 2:
            toggleRotatonManipulatorsDisplay(false);
            toggleTranslationManipulatorsDisplay(true);
            break
          }
        }
      }
    }
    selectionManipulationManager.pub.setMode(0);
    return selectionManipulationManager;
  }});


