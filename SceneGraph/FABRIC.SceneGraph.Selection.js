

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
    
    var selectionManager = {
      pub:{
        isSelected:function( obj ){ 
          return selection.indexOf(obj) != -1;
        },
        select:function( obj ){
          if(!this.isSelected(obj)){ 
            this.clearSelection();
            this.addToSelection(obj);
          }
        },
        addToSelection:function( obj ){
          if(obj.fireEvent){
            obj.fireEvent('selected');
          }
          selection.push(obj);
        },
        removeFromSelection:function( obj ){ 
          if( selection.length == 0 ){
            return;
          }
          var id = selection.indexOf(obj);
          if( id != -1 ){
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
        },
        clearSelection:function(){ 
          if(selection.length > 0){
            for (var i = selection.length-1; i >=0 ; i--) {
              this.removeFromSelection(selection[i]);
            }
          }
        }
      }
    }
    
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
      addToSelectionKeyName: 'ctrlKey'
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
        }else{
          selectionManager.pub.select(evt.targetNode);
          evt.stopPropagation();
          scene.pub.redrawAllViewports();
        }
      });
    scene.pub.addEventListener('mousedown', function(evt){
        selectionManager.pub.clearSelection();
        scene.pub.redrawAllViewports();
      });
    
    return selectionManager;
  }});



