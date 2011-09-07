
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//

FABRIC.SceneGraph.registerNodeType('AnimationTrack', {
  briefDesc: 'The AnimationTrack node implements an array of animation tracks.',
  detailedDesc: 'The AnimationTrack node is an abstract node type that stores an animation track per-slice. Drived nodes must specify the KeyframeType that is being interpollated',
  parentNodeDesc: 'SceneGraphNode',
  optionsDesc: {
    keyframetype: 'Specified by the derrived node, this option specifies the type of the keyframe tract that will be interpollated.',
    name:'The name of the track. This value is displayed in the curve Editor'
  },
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
        keyframetype: undefined,
        name:'AnimationTrack'
      });

    if (options.keyframetype == undefined) {
      throw ('Please specify a type of data to interpollate');
    }

    var rTypes = scene.getRegisteredTypesManager().getRegisteredTypes();
    if (!rTypes[options.keyframetype]) {
      throw ('Keyframetype "' + options.keyframetype + '" is not registered. Load the RT file.');
    }
    var defaultKeyframeValue = rTypes[options.keyframetype].defaultValue;
    if (!defaultKeyframeValue.valueType) {
      throw ('The keyframe registered type must provide a ' +
          'valueType that indicates what the keyframes will evaluate to. ' +
          'Normally this is a Scalar, but could be a Vec2 of any other value');
    }

    var animationTrackNode = scene.constructNode('SceneGraphNode', options);
    var dgnode = animationTrackNode.constructDGNode('DGNode');
    dgnode.addMember('name', 'String', 'keyframeAnimationTrack');
    dgnode.addMember('color', 'Color', FABRIC.RT.rgb(1, 1, 1));
    dgnode.addMember('keys', options.keyframetype + '[]');

    // extend the public interface
    animationTrackNode.pub.getKeyframeType = function() {
      return options.keyframetype;
    };
    animationTrackNode.pub.getValueType = function(trackid) {
      // To determing what kind of data this evaluator should evaluate to,
      // we look up the keyframe type in the type manager, and request the
      // default value, which when is created on demand, enables us to call the valueType
      return defaultKeyframeValue.valueType;
    };
    animationTrackNode.pub.getTrackCount = function() {
      return dgnode.getCount();
    };
    animationTrackNode.pub.setTrackCount = function(count) {
      dgnode.setCount(count);
    };
    animationTrackNode.pub.getTrackName = function(trackid) {
      return dgnode.getData('name', trackid);
    };
    animationTrackNode.pub.getTrackColor = function(trackid) {
      return dgnode.getData('color', trackid);
    };
    animationTrackNode.pub.getTrackKeys = function(trackid) {
      return dgnode.getData('keys', trackid);
    };
    animationTrackNode.pub.setTrackKeys = function(trackid, keys) {
      dgnode.setData('keys', trackid, keys);
    };
    animationTrackNode.pub.getTrackData = function(trackid) {
      return dgnode.getSliceBulkData(trackid);
    };
    animationTrackNode.pub.setTrackData = function(trackid, trackData) {
      dgnode.setSliceBulkData(trackid, trackData);
    };
    animationTrackNode.pub.setTracksData = function(tracksData) {
      dgnode.setBulkData(tracksData);
    };
    animationTrackNode.pub.setKeyData = function(trackid, keyid, keydata) {
      var keys = dgnode.getData('keys', trackid);
      keys[keyid] = keydata;
      dgnode.setData('keys', trackid, keys);
    };

    // extend private interface
    animationTrackNode.getInterpolatorOperator = function() {
      return scene.constructOperator({
          operatorName: 'evaluate'+options.keyframetype+'KeyframeAnimationTrack',
          srcFile: 'FABRIC_ROOT/SceneGraph/KL/evaluateKeyframeAnimationTrack.kl',
          preProcessorDefinitions: {
            KEYFRAMETYPE: options.keyframetype,
            KEYFRAME_EVALUATEDTYPE: defaultKeyframeValue.valueType
          },
          entryFunctionName: 'evaluateKeyframeAnimationTracks',
          parameterLayout: [
            'animationtrack.keys<>',
            'controller.localTime',
            'self.index',
            'self.value',
            'self.keyid'
          ]
        });
    };
    animationTrackNode.getDrawOperator = function() {
      return scene.constructOperator({
          operatorName: 'evaluate'+options.keyframetype+'Curve',
          srcFile: 'FABRIC_ROOT/SceneGraph/KL/evaluateKeyframeAnimationTrack.kl',
          preProcessorDefinitions: {
            KEYFRAMETYPE: options.keyframetype,
            KEYFRAME_EVALUATEDTYPE: defaultKeyframeValue.valueType
          },
          entryFunctionName: 'evaluateCurve',
          parameterLayout: [
            'animationtrack.keys<>',
            'parameters.trackIndex',
            'parameters.timeRange',
            'self.index',
            'self.count',
            'self.time',
            'self.value',
            'self.keyid'
          ],
          async: false
        });
    };
    
    
    animationTrackNode.pub.openCurveEditor = function() {
        var curveEditorWindow = window.open(
          FABRIC.processURL('FABRIC_ROOT/SceneGraph/CurveEditor/CurveEditor.html') + '?id=' + scene.pub.getContextId(),
          '../../../SceneGraph/CurveEditor/CurveEditor.html',
          'Fabric Curve Editor:' + options.name,
          'status=1,resizable=1,width='+window.innerWidth+',height='+(window.innerHeight * 0.6)
        );
        curveEditorWindow.keyframeTrackNode = animationTrackNode.pub;
        curveEditorWindow.scene = scene.pub;
    }
    return animationTrackNode;
  }});


FABRIC.SceneGraph.registerNodeType('LinearKeyAnimationTrack', {
  briefDesc: 'The LinearKeyAnimationTrack node implements an array of linear keyframe animation tracks.',
  detailedDesc: 'The LinearKeyAnimationTrack node derrives from AnimationTrack and specifies that the tracks should contains \'LinearKeyframes\'',
  parentNodeDesc: 'AnimationTrack',
  factoryFn: function(options, scene) {
    options.keyframetype = 'LinearKeyframe';
    return scene.constructNode('AnimationTrack', options);
  }});


FABRIC.SceneGraph.registerNodeType('BezierKeyAnimationTrack', {
  briefDesc: 'The BezierKeyAnimationTrack node implements an array of bezier keyframe animation tracks.',
  detailedDesc: 'The BezierKeyAnimationTrack node derrives from AnimationTrack and specifies that the tracks should contains \'BezierKeyframe\'',
  parentNodeDesc: 'AnimationTrack',
  factoryFn: function(options, scene) {
    options.keyframetype = 'BezierKeyframe';
    return scene.constructNode('AnimationTrack', options);
  }});


FABRIC.SceneGraph.registerNodeType('AnimationController', {
  briefDesc: 'The AnimationController node controls the time at which an AnimationTrack is evaluated.',
  detailedDesc: 'The Animation Controller only maintains time values which can be used by'+
                'animation evaluators. Many evaluators can share an Animation Controller',
  parentNodeDesc: 'SceneGraphNode',
  optionsDesc: {
    playbackRate: 'The rate to increment the time values, relative to the global scene time increments.'
  },
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
        playbackRate: 1.0,
        bindToGlobalTime: true,
        timeRange: FABRIC.RT.vec2(0, 10),
        timeControl: 0, /* 0: absolute, 1:increment */
        outOfRange: 1 /* 0: linear, 1:loop, 3:clamp */
      });

    var animationControllerNode = scene.constructNode('SceneGraphNode', options);
    var dgnode = animationControllerNode.constructDGNode('DGNode');
    dgnode.addMember('timeControl', 'Integer', options.timeControl);
    dgnode.addMember('playbackRate', 'Scalar', options.playbackRate);
    dgnode.addMember('localTime', 'Scalar');
    dgnode.addMember('timeRange', 'Vec2', options.timeRange);
    dgnode.addMember('outOfRange', 'Integer', options.outOfRange);
    
    // create a getter and setter for the local time
    animationControllerNode.addMemberInterface(dgnode, 'playbackRate', true);
    animationControllerNode.addMemberInterface(dgnode, 'localTime', true);
    animationControllerNode.addMemberInterface(dgnode, 'timeRange', true);

    // extend public interface
    animationControllerNode.pub.setTime = function(time) {
      dgnode.setData('localTime', 0, time);
    };

    // Here, the animation controllers time is locked to
    // global time. Often the time context for an animation
    // is computed, or simulated based on scene events.
    if(options.bindToGlobalTime) {
      dgnode.addDependency(scene.getGlobalsNode(), 'globals');
      
      // This operator might simulate the platback local time by incrementing
      // it each frame by a rate specified by the playbackRate parameter.
      dgnode.bindings.append(scene.constructOperator( {
          operatorName:'incrementControllerLocalTime',
          srcFile:'FABRIC_ROOT/SceneGraph/KL/incrementControllerLocalTime.kl',
          entryFunctionName:'incrementControllerLocalTime',
          parameterLayout: [
            'globals.time',
            'globals.timestep',
            'self.timeControl',
            'self.playbackRate',
            'self.timeRange',
            'self.outOfRange',
            'self.localTime'
          ]
        }));
    }
    return animationControllerNode;
  }});


FABRIC.SceneGraph.registerNodeType('AnimationEvaluator', {
  briefDesc: 'The animation evaluator evaluates the keyframe animation tracks using the time computed in the animation controller.',
  detailedDesc: 'The animation evaluator evaluates the keyframe animation tracks using the time computed in the animation controller.'+
                'It stores the evaluated values which are in turn bound to parameters on other nodes',
  parentNodeDesc: 'SceneGraphNode',
  optionsDesc: {
    animationControllerNode: 'The AnimationController node to initialize with.',
    animationTrackNode: 'The AnimationTrack node to initialize with.'
  },
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
        animationControllerNode: undefined,
        animationTrackNode: undefined
      });

    var animationEvaluatorNode = scene.constructNode('SceneGraphNode', options);

    var evaluatorDatatype = options.animationTrackNode.getValueType();
    var dgnode = animationEvaluatorNode.constructDGNode('DGNode');
    dgnode.addMember('value', evaluatorDatatype, 0);
    dgnode.addMember('keyid', 'Integer', 0);

    var animationControllerNode, animationTrackNode;

    // extend the public interface
    animationEvaluatorNode.pub.setAnimationController = function(node) {
      if (!node.isTypeOf('AnimationController')) {
        throw ('Incorrect type assignment. Must assign a AnimationController');
      }
      node = scene.getPrivateInterface(node);
      dgnode.addDependency(node.getDGNode(), 'controller');
      animationControllerNode = node;
    };
    animationEvaluatorNode.pub.setAnimationTrackNode = function(node) {
      if (!node.isTypeOf('AnimationTrack')) {
        throw ('Incorrect type assignment. Must assign a AnimationTrack');
      }
      node = scene.getPrivateInterface(node);
      animationTrackNode = node;
      evaluatorDatatype = animationTrackNode.pub.getValueType();
      dgnode.addDependency(animationTrackNode.getDGNode(), 'animationtrack');
      dgnode.setCount(animationTrackNode.pub.getTrackCount());
      dgnode.bindings.append(animationTrackNode.getInterpolatorOperator());
    };
    animationEvaluatorNode.pub.getValue = function(time) {
      if (!animationController || !animationTrackNode) {
        throw ('Animation Controller or AnimationTrackNode not assigned');
      }
      animationController.pub.setTime('time');
      dgnode.evaluate();
      return dgnode.getData('value');
    };
    animationEvaluatorNode.pub.bindNodeMembersToEvaluatorTracks = function(targetnode, memberBindings) {
      // Generate a unique operator that binds this animation evaluator to the
      // target node's members.

      var registeredTypes = scene.getRegisteredTypesManager().getRegisteredTypes();
      targetnode = scene.getPrivateInterface(targetnode);
      targetnode.getDGNode().addDependency(dgnode, 'animationevaluator');

      var targetNodeMembers = targetnode.getDGNode().getMembers();

      var operatorName = 'bindAnimationTracksTo' + JSON.stringify(memberBindings).replace(/[^a-zA-Z 0-9]+/g, '');
      var operatorHeaderSrc = '\nuse Vec3, Euler, Quat, RotationOrder; operator ' + operatorName + '(\n\tio ' + evaluatorDatatype + ' curvevalues<>';
      var operatorArraySrc = {};
      var operatorBodySrc = '';
      var parameterLayout = ['animationevaluator.value<>'];
      var tempVariables = {};
      for (var memberAccessor in memberBindings) {
        var memberBinding = memberBindings[memberAccessor];
        var splitMemberAccessor = memberAccessor.split('.');
        var memberName = splitMemberAccessor[0];
        var memberIndex = undefined;
        if (memberName.indexOf('[') > 0) {
          memberIndex = memberName.substr(memberName.indexOf('[') + 1);
          memberIndex = parseInt(memberIndex.substr(0, memberIndex.indexOf(']')));
          memberName = memberName.substr(0, memberName.indexOf('['));
          if (operatorArraySrc[memberName]) {
            if (operatorArraySrc[memberName] < memberIndex) {
              operatorArraySrc[memberName] = memberIndex;
            }
          }
          else {
            operatorArraySrc[memberName] = memberIndex;
          }
        }
        var boundMemberType = targetNodeMembers[memberName].type;
        var isArray = false;
        if (boundMemberType.indexOf('[') > 0) {
          boundMemberType = boundMemberType.substr(0, boundMemberType.indexOf('['));
          isArray = true;
        }
        var memberType = boundMemberType;
        var typeDesc = registeredTypes[memberType];
        for (i = 1; i < splitMemberAccessor.length; i++) {
          var newMemberType = null;
          for (var j = 0; j < typeDesc.members.length; ++j) {
            if (typeDesc.members[j].name == splitMemberAccessor[i]) {
              newMemberType = typeDesc.members[j].type;
              break;
            }
          }
          if (!newMemberType)
            throw 'unable to find member "' + splitMemberAccessor[i] + '" of type "' + memberType + '"';
          memberType = newMemberType;
          typeDesc = registeredTypes[memberType];
        }
        var memberBindingCode = '';
        switch (memberType) {
          case 'Integer':

            break;
          case 'Scalar':
            memberBindingCode = memberAccessor + ' = curvevalues[' + memberBindings[memberAccessor][0] + '];\n';
            break;
          case 'Vec3':
            if (memberBinding[0] >= 0)
              memberBindingCode += '\t' + memberAccessor + '.x = curvevalues[' + memberBinding[0] + '];\n';
            if (memberBinding[1] >= 0)
              memberBindingCode += '\t' + memberAccessor + '.y = curvevalues[' + memberBinding[1] + '];\n';
            if (memberBinding[2] >= 0)
              memberBindingCode += '\t' + memberAccessor + '.z = curvevalues[' + memberBinding[2] + '];\n';
            break;
          case 'Quat':
            if (memberBinding.length === 3) {
              if (!tempVariables['tempVec3']) {
                tempVariables['tempVec3'] = '\tvar Vec3 tempVec3;\n';
              }
              if (!tempVariables['tempEuler']) {
                tempVariables['tempEuler'] = '\tvar Euler tempEuler;\n';
              }
              if (memberBinding[0] >= 0)
                memberBindingCode += '\ttempVec3.x = curvevalues[' + memberBinding[0] + '];\n';
              else
                memberBindingCode += '\ttempVec3.x = 0.0;\n';
              if (memberBinding[1] >= 0)
                memberBindingCode += '\ttempVec3.y = curvevalues[' + memberBinding[1] + '];\n';
              else
                memberBindingCode += '\ttempVec3.y = 0.0;\n';
              if (memberBinding[2] >= 0)
                memberBindingCode += '\ttempVec3.z = curvevalues[' + memberBinding[2] + '];\n';
              else
                memberBindingCode += '\ttempVec3.z = 0.0;\n';
              memberBindingCode += '\ttempEuler = Euler(tempVec3);\n';
              memberBindingCode += '\t' + memberAccessor + ' = Quat(tempEuler);\n';
            }else if (memberBinding.length === 4) {

            }
            break;

        }
        operatorBodySrc += '\n' + memberBindingCode;

        if (parameterLayout.indexOf('self.' + memberName) == -1) {
          operatorHeaderSrc += ',\n\tio ' + boundMemberType + ' ' + memberName + (isArray ? '[]' : '');
          parameterLayout.push('self.' + memberName);
        }
      }

      // add the array resize code to ensure that they are big enough
      operatorHeaderSrc += '\n\t){';
      for (var arrayName in operatorArraySrc) {
        operatorHeaderSrc += '\n\tif(' + arrayName + '.size() < ' + (operatorArraySrc[arrayName] + 1) + '){';
        operatorHeaderSrc += '\n\t\t' + arrayName + '.resize(' + (operatorArraySrc[arrayName] + 1) + ');';
        operatorHeaderSrc += '\n\t}';
      }

      // add the temporary varibale declaration at the top of the function body.
      for (i in tempVariables) {
        operatorBodySrc = tempVariables[i] + operatorBodySrc;
      }
      operatorBodySrc = '\n' + operatorBodySrc + '}';

      //console.log(operatorHeaderSrc + operatorBodySrc);
      //console.log(parameterLayout);

      if (targetnode.getDGNode().bindings.length > 0) {
        targetnode.getDGNode().bindings.insert(scene.constructOperator({
            operatorName: operatorName,
            srcCode: operatorHeaderSrc + operatorBodySrc,
            entryFunctionName: operatorName,
            parameterLayout: parameterLayout
          }), 0);
      }
      else {
        targetnode.getDGNode().bindings.append(scene.constructOperator({
            operatorName: operatorName,
            srcCode: operatorHeaderSrc + operatorBodySrc,
            entryFunctionName: operatorName,
            parameterLayout: parameterLayout
          }));
      }
    };

    if (options.animationControllerNode) {
      animationEvaluatorNode.pub.setAnimationController(options.animationControllerNode);
    }
    if (options.animationTrackNode) {
      animationEvaluatorNode.pub.setAnimationTrackNode(options.animationTrackNode);
    }
    return animationEvaluatorNode;
  }});




FABRIC.SceneGraph.registerNodeType('TrackDisplay', {
  briefDesc: 'The TrackDisplay evaluates AnimationTracks across time ranges ready for display in the CurveEditor.',
  detailedDesc: 'The TrackDisplay evaluates AnimationTracks across time ranges ready for display in the CurveEditor.',
  parentNodeDesc: 'SceneGraphNode',
  optionsDesc: {
      animationTrackNode: 'The AnimationTrack node to evaluate.',
      trackIndex: 'The index of the track in the AnimationTrack node to evaluate.',
      timeRange: 'The time rage to evaluate.',
      segmentCount: 'The number of steps to divide the timeRange by.'
  },
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
        animationTrackNode: undefined,
        trackIndex: 0,
        timeRange: FABRIC.RT.vec2(0, 100),
        segmentCount: 100
      });

    var trackDisplayNode = scene.constructNode('SceneGraphNode', options);
    var dgnode = trackDisplayNode.constructDGNode('DGNode');
    var parametersdgnode = trackDisplayNode.constructDGNode('ParametersDGNode');

    parametersdgnode.addMember('timeRange', 'Vec2', options.timeRange);
    parametersdgnode.addMember('trackIndex', 'Integer', options.trackIndex);

    dgnode.addMember('time', 'Scalar', 0);
    dgnode.addMember('value', options.animationTrackNode.getValueType(), 0);
    dgnode.addMember('keyid', 'Integer', 0);
    dgnode.addDependency(parametersdgnode, 'parameters');

    dgnode.setCount(options.segmentCount);

    var animationControllerNode, animationTrackNode;

    // extend the public interface
    trackDisplayNode.pub.setAnimationTrackNode = function(node, trackIndex) {
      if (!node.isTypeOf('AnimationTrack')) {
        throw ('Incorrect type assignment. Must assign a AnimationTrack');
      }
      animationTrackNode = scene.getPrivateInterface(node);
      evaluatorDatatype = animationTrackNode.pub.getValueType();
      dgnode.addDependency(animationTrackNode.getDGNode(), 'animationtrack');

      parametersdgnode.setData('trackIndex', options.trackIndex ? options.trackIndex : 0);

      dgnode.bindings.append(animationTrackNode.getDrawOperator());
    };
    trackDisplayNode.pub.setTimeRange = function(timeRange) {
      parametersdgnode.setData('timeRange', timeRange);
    };
    trackDisplayNode.pub.getTimeRange = function(timeRange) {
      return parametersdgnode.getData('timeRange');
    };
    trackDisplayNode.pub.getCurveData = function() {
      dgnode.evaluate();
      return dgnode.getBulkData();
    }

    if (options.animationTrackNode) {
      trackDisplayNode.pub.setAnimationTrackNode(options.animationTrackNode);
    }
    return trackDisplayNode;
  }});


