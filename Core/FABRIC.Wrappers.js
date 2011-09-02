
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//

var wrapFabricClient = function(fabricClient, logCallback, debugLogCallback) {

  var queuedCommands = [];
  var queuedUnwinds = [];
  var queuedCallbacks = [];

  var executeQueuedCommands = function() {
    if (queuedCommands.length > 0) {
      var commands = queuedCommands;
      queuedCommands = [];
      var callbacks = queuedCallbacks;
      queuedCallbacks = [];
      var unwinds = queuedUnwinds;
      queuedUnwinds = [];

      var jsonEncodedCommands = JSON.stringify(commands);
      if (debugLogCallback)
        debugLogCallback('-> ' + jsonEncodedCommands);

      var jsonEncodedResults = fabricClient.jsonExec(jsonEncodedCommands);
      if (debugLogCallback)
        debugLogCallback('<- ' + jsonEncodedResults);

      var results;
      try {
        results = JSON.parse(jsonEncodedResults);
      }
      catch (e) {
        throw 'unable to parse JSON results:' + jsonEncodedResults;
      }
      for (var i = 0; i < results.length; ++i) {
        var result = results[i];
        var callback = callbacks[i];
        if ('exception' in result) {
          for (var j = unwinds.length; j-- > i; ) {
            var unwind = unwinds[j];
            if (unwind)
              unwind();
          }
          throw 'Fabric core exception: ' + result.exception;
        }
        else if (callback)
          callback(result.result);
      }
    }
  };

  var queueCommand = function(dst, cmd, arg, unwind, callback) {
    var command = {
      dst: dst,
      cmd: cmd
    };
    if (arg !== undefined)
      command.arg = arg;

    queuedCommands.push(command);
    queuedUnwinds.push(unwind);
    queuedCallbacks.push(callback);

    if (queuedCommands.length >= 262144)
      executeQueuedCommands();
  };

  var createRT = function() {
    var RT = {};

    RT.assignPrototypes = function(data, typeName) {
      if (typeName.substring(typeName.length - 2) == '[]') {
        typeName = typeName.substring(0, typeName.length - 2);
        for (var i = 0; i < data.length; ++i) {
          RT.assignPrototypes(data[i], typeName);
        }
      }
      else if (typeName in RT.prototypes) {
        data.__proto__ = RT.prototypes[typeName];
        if ('members' in RT.registeredTypes[typeName]) {
          var members = RT.registeredTypes[typeName].members;
          for (var i = 0; i < members.length; ++i) {
            var member = members[i];
            RT.assignPrototypes(data[member.name], member.type);
          }
        }
      }
      return data;
    };

    RT.queueCommand = function(cmd, arg, unwind, callback) {
      queueCommand(['RT'], cmd, arg, unwind, callback);
    };

    RT.patch = function(diff) {
      if ('registeredTypes' in diff) {
        RT.registeredTypes = {};
        for (var typeName in diff.registeredTypes) {
          RT.registeredTypes[typeName] = RT.assignPrototypes(diff.registeredTypes[typeName], typeName);
        }
      }
    };

    RT.handleStateNotification = function(state) {
      RT.prototypes = {};
      RT.patch(state);
    };

    RT.handle = function(cmd, arg) {
      switch (cmd) {
        case 'delta':
          this.patch(arg);
          break;
        default:
          throw 'unrecognized';
      }
    };

    RT.route = function(src, cmd, arg) {
      if (src.length == 0) {
        try {
          handle(cmd, arg);
        }
        catch (e) {
          throw "command '" + cmd + "': " + e;
        }
      }
      else if (src.length == 1) {
        var typeName = src[0];
        try {
          switch (cmd) {
            case 'delta':
              RT.registeredTypes[typeName] = arg;
              RT.registeredTypes[typeName].defaultValue =
                RT.assignPrototypes(RT.registeredTypes[typeName].defaultValue, typeName);
              break;
            default:
              throw 'unrecognized';
          }
        }
        catch (e) {
          throw "'" + cmd + "': " + e;
        }
      }
      else
        throw 'unroutable';
    };

    RT.pub = {
      getRegisteredTypes: function() {
        executeQueuedCommands();
        return RT.registeredTypes;
      },

      registerType: function(name, desc) {
        var members = [];
        for (var descMemberName in desc.members) {
          var member = {
            name: descMemberName,
            type: desc.members[descMemberName]
          };
          members.push(member);
        }

        var defaultValue = new desc.constructor();
        RT.prototypes[name] = defaultValue.__proto__;

        var arg = {
          name: name,
          members: members,
          defaultValue: defaultValue
        };
        if ('kBindings' in desc)
          arg.kBindings = desc.kBindings;

        RT.queueCommand('registerType', arg, function() {
          delete RT.prototypes[name];
        });
      }
    };

    return RT;
  };
  var RT = createRT();

  var createDG = function() {
    var DG = {
      namedObjects: {}
    };

    DG.queueCommand = function(dst, cmd, arg, unwind, callback) {
      queueCommand(['DG'].concat(dst), cmd, arg, unwind, callback);
    };

    DG.createBinding = function() {
      var result = {
        parameterLayout: []
      };

      result.pub = {};

      result.pub.getOperator = function() {
        return result.operator;
      };

      result.pub.setOperator = function(operator) {
        result.operator = operator;
      };

      result.pub.getParameterLayout = function() {
        return result.parameterLayout;
      };

      result.pub.setParameterLayout = function(parameterLayout) {
        result.parameterLayout = parameterLayout;
      };

      return result;
    };

    DG.createBindingList = function(dst) {
      var result = { bindings: [] };

      result.patch = function(state) {
        result.bindings = [];
        for (var i = 0; i < state.length; ++i) {
          var binding = {
            operator: DG.namedObjects[state[i].operator].pub,
            parameterLayout: state[i].parameterLayout
          };
          result.bindings.push(binding);
        }
      };

      result.handle = function(cmd, arg) {
        switch (cmd) {
          case 'delta':
            result.patch(arg);
            break;
          default:
            throw 'unrecognized';
        }
      };

      result.route = function(src, cmd, arg) {
        if (src.length == 0) {
          try {
            result.handle(cmd, arg);
          }
          catch (e) {
            throw "command '" + cmd + "': " + e;
          }
        }
        else
          throw 'unroutable';
      };

      result.handleStateNotification = function(state) {
        result.patch(state);
      };

      result.pub = {};

      result.pub.empty = function() {
        if (!('bindings' in result))
          executeQueuedCommands();
        return result.bindings.length == 0;
      };

      result.pub.getLength = function() {
        if (!('bindings' in result))
          executeQueuedCommands();
        return result.bindings.length;
      };

      result.pub.getOperator = function(index) {
        if (!('bindings' in result))
          executeQueuedCommands();
        return result.bindings[index].operator;
      };

      result.pub.append = function(binding) {
        var operatorName;
        try {
          operatorName = binding.getOperator().getName();
        }
        catch (e) {
          throw 'operator: not an operator';
        }

        var oldBindings = result.bindings;
        delete result.bindings;

        DG.queueCommand(dst, 'append', {
          operatorName: operatorName,
          parameterLayout: binding.getParameterLayout()
        }, function() {
          result.bindings = oldBindings;
        });
      };

      result.pub.insert = function(binding, beforeIndex) {
        var operatorName;
        try {
          operatorName = binding.getOperator().getName();
        }
        catch (e) {
          throw 'operator: not an operator';
        }

        if (typeof beforeIndex !== 'number')
          throw 'beforeIndex: must be an integer';

        var oldBindings = result.bindings;
        delete result.bindings;

        DG.queueCommand(dst, 'insert', {
          beforeIndex: beforeIndex,
          operatorName: operatorName,
          parameterLayout: binding.getParameterLayout()
        }, function() {
          result.bindings = oldBindings;
        });
      };
      
      result.pub.remove = function(index) {
        var oldBindings = result.bindings;
        delete result.bindings;
        DG.queueCommand(dst, 'remove', {
          index: index,
        }, function() {
          result.bindings = oldBindings;
        });
      };

      return result;
    };

    DG.createNamedObject = function(name) {
      if (name in DG.namedObjects)
        throw "a NamedObject named '" + name + "' already exists";

      var result = {};

      result.name = name;

      result.queueCommand = function(cmd, arg, unwind, callback) {
        if (!this.name)
          throw "NamedObject '" + name + "' has been deleted";
        DG.queueCommand([this.name], cmd, arg, unwind, callback);
      };

      result.patch = function(diff) {
        if ('errors' in diff)
          result.errors = diff.errors;
      };

      result.destroy = function() {
        delete DG.namedObjects[name];
        delete result.name;
      };

      result.handle = function(cmd, arg) {
        switch (cmd) {
          case 'delta':
            result.patch(arg);
            break;
          default:
            throw 'unrecognized';
        }
      };

      result.route = function(src, cmd, arg) {
        if (src.length == 0) {
          try {
            result.handle(cmd, arg);
          }
          catch (e) {
            throw "command '" + cmd + "': " + e;
          }
        }
        else
          throw 'unroutable';
      };

      result.pub = {};

      result.pub.getName = function() {
        return result.name;
      };

      result.pub.getErrors = function() {
        executeQueuedCommands();
        return result.errors;
      };

      DG.namedObjects[name] = result;

      return result;
    };

    DG.createOperator = function(name) {
      var result = DG.createNamedObject(name);

      result.diagnostics = [];

      var parentPatch = result.patch;
      result.patch = function(diff) {
        parentPatch(diff);

        if ('sourceCode' in diff)
          result.sourceCode = diff.sourceCode;

        if ('entryFunctionName' in diff)
          result.entryFunctionName = diff.entryFunctionName;

        if ('diagnostics' in diff)
          result.diagnostics = diff.diagnostics;

        if ('mainThreadOnly' in diff)
          result.mainThreadOnly = diff.mainThreadOnly;
      };

      result.pub.getMainThreadOnly = function() {
        if (!('mainThreadOnly' in result))
          executeQueuedCommands();
        return result.mainThreadOnly;
      }

      result.pub.setMainThreadOnly = function(mainThreadOnly) {
        var oldMainThreadOnly = result.mainThreadOnly;
        result.mainThreadOnly = mainThreadOnly;
        result.queueCommand('setMainThreadOnly', mainThreadOnly, function() {
          result.mainThreadOnly = oldMainThreadOnly;
        });
      };

      result.pub.getSourceCode = function() {
        if (!('sourceCode' in result))
          executeQueuedCommands();
        return result.sourceCode;
      };

      result.pub.setSourceCode = function(sourceCode) {
        var oldSourceCode = result.sourceCode;
        result.sourceCode = sourceCode;
        var oldDiagnostics = result.diagnostics;
        delete result.diagnostics;
        result.queueCommand('setSourceCode', sourceCode, function() {
          result.sourceCode = oldSourceCode;
          result.diagnostics = oldDiagnostics;
        });
      };

      result.pub.getEntryFunctionName = function() {
        if (!('entryFunctionName' in result))
          executeQueuedCommands();
        return result.entryFunctionName;
      };

      result.pub.setEntryFunctionName = function(entryFunctionName) {
        var oldEntryFunctionName = result.entryFunctionName;
        result.entryFunctionName = entryFunctionName;
        result.queueCommand('setEntryFunctionName', entryFunctionName, function() {
          result.entryFunctionName = oldEntryFunctionName;
        });
        delete result.diagnostics;
      };

      result.pub.getDiagnostics = function() {
        if (!('diagnostics' in result))
          executeQueuedCommands();
        return result.diagnostics;
      };

      return result;
    };

    DG.createContainer = function(name) {
      var result = DG.createNamedObject(name);

      var parentPatch = result.patch;
      result.patch = function(diff) {
        parentPatch(diff);

        if ('members' in diff)
          result.members = diff.members;

        if ('count' in diff)
          result.count = diff.count;
      };

      var parentHandleNotification = result.handle;
      result.handle = function(cmd, arg) {
        if (cmd == 'dataChange') {
          var memberName = arg.memberName;
          var sliceIndex = arg.sliceIndex;
          /* [pzion 20110524] would invalidate cache here */
        }
        else {
          parentHandleNotification(cmd, arg);
        }
      };

      result.pub.getCount = function() {
        if (!('count' in result))
          executeQueuedCommands();
        return result.count;
      };

      result.pub.setCount = function(count) {
        result.queueCommand('setCount', count);
        delete result.count;
      };

      result.pub.getMembers = function() {
        if (!('members' in result))
          executeQueuedCommands();
        return result.members;
      };

      result.pub.addMember = function(memberName, memberType, defaultValue) {
        if (!('members' in result))
          result.members = {};
        if (memberName in result.members)
          throw "there is already a member named '" + memberName + "'";

        var arg = {
          'name': memberName,
          'type': memberType
        };
        if (defaultValue !== undefined)
          arg.defaultValue = defaultValue;

        result.members[memberName] = arg;

        result.queueCommand('addMember', arg, function() {
          delete result.members[memberName];
        });
      };

      result.pub.removeMember = function(memberName) {
        if (!('members' in result) || !(memberName in result.members))
          throw "there is no member named '" + memberName + "'";
        var oldMember = result.members[memberName];
        delete result.members[memberName];

        result.queueCommand('removeMember', memberName, function() {
          result.members[memberName] = oldMember;
        });
      };

      result.pub.getData = function(memberName, sliceIndex) {
        if (sliceIndex === undefined)
          sliceIndex = 0;

        var functionResult;
        result.queueCommand('getData', {
          'memberName': memberName,
          'sliceIndex': sliceIndex
        }, function() {
        }, function(data) {
          functionResult = RT.assignPrototypes(data, result.members[memberName].type);
        });
        executeQueuedCommands();
        return functionResult;
      };

      result.pub.getDataSize = function(memberName, sliceIndex) {
        var dataSize;
        result.queueCommand('getDataSize', {
          'memberName': memberName,
          'sliceIndex': sliceIndex
        }, function() {
        }, function(data) {
          dataSize = data;
        });
        executeQueuedCommands();
        return dataSize;
      };

      result.pub.getDataElement = function(memberName, sliceIndex, elementIndex) {
        var dataElement;
        result.queueCommand('getDataElement', {
          'memberName': memberName,
          'sliceIndex': sliceIndex,
          'elementIndex': elementIndex
        }, function() {
        }, function(data) {
          dataElement = RT.assignPrototypes(data, result.members[memberName].type);
        });
        executeQueuedCommands();
        return dataElement;
      };

      result.pub.setData = function(memberName, sliceIndex, data) {
        if (data == undefined) {
          data = sliceIndex;
          sliceIndex = 0;
        }

        result.queueCommand('setData', {
          'memberName': memberName,
          'sliceIndex': sliceIndex,
          'data': data
        });
      };

      result.pub.getBulkData = function() {
        var bulkData;
        result.queueCommand('getBulkData', null, function() { }, function(data) {
          for (var memberName in data) {
            var member = data[memberName];
            for (var i = 0; i < member.length; ++i)
              RT.assignPrototypes(member[i], result.members[memberName].type);
          }
          bulkData = data;
        });
        executeQueuedCommands();
        return bulkData;
      };

      result.pub.setBulkData = function(data) {
        result.queueCommand('setBulkData', data);
      };

      result.pub.getSliceBulkData = function(index) {
        if (typeof index !== 'number') {
          throw 'index: must be an integer';
        }
        return result.pub.getSlicesBulkData([index])[0];
      };

      result.pub.getSlicesBulkData = function(indices) {
        var slicesBulkData;
        result.queueCommand('getSlicesBulkData', indices, function() { }, function(data) {
          for (var i = 0; i < data.length; i++) {
            for (var memberName in data[i]) {
              RT.assignPrototypes(data[i][memberName], result.members[memberName].type);
            }
          }
          slicesBulkData = data;
        });
        executeQueuedCommands();
        return slicesBulkData;
      };

      result.pub.setSlicesBulkData = function(data) {
        result.queueCommand('setSlicesBulkData', data);
      };

      result.pub.setSliceBulkData = function(sliceIndex, data) {
        result.queueCommand('setSlicesBulkData', [{
          sliceIndex: sliceIndex,
          data: data
        }]);
      };

      result.pub.writeResourceToUserFile = function(memberName, defaultFileName) {
        result.queueCommand('evaluate');//Make sure the node has evaluated (however it's not garanteed that the resource is there if asynch)
        executeQueuedCommands();
        result.queueCommand('writeResourceToUserFile', {
          'memberName': memberName,
          'defaultFileName': defaultFileName
        });
        executeQueuedCommands();
      };

      return result;
    };

    DG.createNode = function(name) {
      var result = DG.createContainer(name);

      result.bindings = DG.createBindingList([name, 'bindings']);

      var parentPatch = result.patch;
      result.patch = function(diff) {
        parentPatch(diff);

        if ('dependencies' in diff) {
          result.dependencies = {};
          for (var dependencyName in diff.dependencies) {
            var dependencyNodeName = diff.dependencies[dependencyName];
            result.dependencies[dependencyName] = DG.namedObjects[dependencyNodeName].pub;
          }
        }

        if ('bindings' in diff)
          result.bindings.patch(diff.bindings);
      };

      var parentRoute = result.route;
      result.route = function(src, cmd, arg) {
        if (src.length == 1 && src[0] == 'bindings') {
          src.shift();
          result.bindings.route(src, cmd, arg);
        }
        else
          parentRoute(src, cmd, arg);
      };

      result.pub.getType = function() {
        return 'Node';
      };

      result.pub.addDependency = function(dependencyNode, dependencyName) {
        try {
          if (typeof dependencyName !== 'string')
            throw 'must be a string';
          else if (dependencyName == '')
            throw 'must not be empty';
          else if (dependencyName == 'self')
            throw "must not be 'self'";
        }
        catch (e) {
          throw 'dependencyName: ' + e;
        }
        result.queueCommand('addDependency', {
          'name': dependencyName,
          'node': dependencyNode.getName()
        });
        delete result.dependencies;
      };

      result.pub.getDependencies = function() {
        if (!('dependencies' in result))
          executeQueuedCommands();
        return result.dependencies;
      };

      result.pub.getDependency = function(name) {
        if (!('dependencies' in result))
          executeQueuedCommands();
        if (!(name in result.dependencies))
          throw "no dependency named '" + name + "'";
        return result.dependencies[name];
      };

      result.pub.evaluate = function() {
        result.queueCommand('evaluate');
        executeQueuedCommands();
      };

      result.pub.bindings = result.bindings.pub;

      return result;
    };

    DG.createResourceLoadNode = function(name) {
      var parentHandle,
        onloadCallbacks = [];

      var node = DG.createNode(name);

      parentHandle = node.handle;

      node.handle = function(cmd, arg) {
        var i;
        switch (cmd) {
          case 'resourceLoaded':
            for (i = 0; i < onloadCallbacks.length; i++) {
              onloadCallbacks[i](node.pub);
            }
            break;
          default:
            parentHandle(cmd, arg);
        }
      };

      node.pub.addOnLoadCallback = function(callback) {
        //At this 'core' level we don't try to detect same/different URLs or the fact that is it already loaded
        onloadCallbacks.push(callback);
      }
      return node;
    };

    DG.createEvent = function(name) {
      var result = DG.createContainer(name);

      var parentPatch = result.patch;
      result.patch = function(diff) {
        parentPatch(diff);

        if ('eventHandlers' in diff) {
          result.eventHandlers = [];
          for (var eventHandlerIndex in diff.eventHandlers) {
            var eventHandlerName = diff.eventHandlers[eventHandlerIndex];
            result.eventHandlers.push(DG.namedObjects[eventHandlerName].pub);
          }
        }
      };

      var parentHandleNotification = result.handle;
      result.handle = function(cmd, arg) {
        if (cmd == 'didFire') {
          if (result.didFireCallback)
            result.didFireCallback.call(result.pub);
        }
        else
          parentHandleNotification(cmd, arg);
      };

      result.pub.getType = function() {
        return 'Event';
      };

      result.pub.appendEventHandler = function(eventHandler) {
        result.queueCommand('appendEventHandler', eventHandler.getName());
        delete result.eventHandlers;
      };

      result.pub.getEventHandlers = function() {
        if (!('eventHandlers' in result))
          executeQueuedCommands();
        return result.eventHandlers;
      };

      result.pub.fire = function() {
        result.queueCommand('fire');
        executeQueuedCommands();
      };

      result.pub.select = function(typeName) {
        var results = [];
        result.queueCommand('select', typeName, function() { }, function(commandResults) {
          for (var i = 0; i < commandResults.length; ++i) {
            var commandResult = commandResults[i];
            results.push({
              node: DG.namedObjects[commandResult.node].pub,
              value: RT.assignPrototypes(commandResult.data, typeName)
            });
          }
        });
        executeQueuedCommands();
        return results;
      };

      result.pub.getDidFireCallback = function() {
        return result.didFireCallback;
      };

      result.pub.setDidFireCallback = function(didFireCallback) {
        result.didFireCallback = didFireCallback;
      };

      return result;
    };

    DG.createEventHandler = function(name) {
      var result = DG.createContainer(name);

      result.preDescendBindings = DG.createBindingList([name, 'preDescendBindings']);
      result.postDescendBindings = DG.createBindingList([name, 'postDescendBindings']);

      var parentPatch = result.patch;
      result.patch = function(diff) {
        parentPatch(diff);

        if ('bindingName' in diff) {
          result.bindingName = diff.bindingName;
        }

        if ('childEventHandlers' in diff) {
          result.childEventHandlers = [];
          for (var childEventHandlerIndex in diff.childEventHandlers) {
            var childEventHandlerName = diff.childEventHandlers[childEventHandlerIndex];
            result.childEventHandlers.push(DG.namedObjects[childEventHandlerName].pub);
          }
        }

        if ('scopes' in diff) {
          result.scopes = {};
          for (var scopeName in diff.scopes) {
            var scopeNodeName = diff.scopes[scopeName];
            result.scopes[scopeName] = DG.namedObjects[scopeNodeName].pub;
          }
        }

        if ('preDescendBindings' in diff)
          result.preDescendBindings.patch(diff.preDescendBindings);

        if ('postDescendBindings' in diff)
          result.postDescendBindings.patch(diff.postDescendBindings);
      };

      var parentRoute = result.route;
      result.route = function(src, cmd, arg) {
        if (src.length == 1 && src[0] == 'preDescendBindings') {
          src.shift();
          result.preDescendBindings.route(src, cmd, arg);
        }
        else if (src.length == 1 && src[0] == 'postDescendBindings') {
          src.shift();
          result.postDescendBindings.route(src, cmd, arg);
        }
        else
          parentRoute(src, cmd, arg);
      };

      result.pub.getType = function() {
        return 'EventHandler';
      };

      result.pub.getScopeName = function() {
        return result.bindingName;
      };

      result.pub.setScopeName = function(bindingName) {
        var oldBindingName = result.bindingName;
        result.queueCommand('setScopeName', bindingName, function() {
          result.bindingName = oldBindingName;
        });
      };

      result.pub.appendChildEventHandler = function(childEventHandler) {
        var oldChildEventHandlers = result.childEventHandlers;
        delete result.childEventHandlers;
        result.queueCommand('appendChildEventHandler', childEventHandler.getName(), function() {
          result.childEventHandlers = oldChildEventHandlers;
        });
      };

      result.pub.removeChildEventHandler = function(childEventHandler) {
        var oldChildEventHandlers = result.childEventHandlers;
        delete result.childEventHandlers;
        result.queueCommand('removeChildEventHandler', childEventHandler.getName(), function() {
          result.childEventHandlers = oldChildEventHandlers;
        });
      };

      result.pub.getChildEventHandlers = function() {
        if (!('childEventHandlers' in result))
          executeQueuedCommands();
        return result.childEventHandlers;
      };

      result.pub.addScope = function(name, node) {
        result.queueCommand('addScope', {
          name: name,
          node: node.getName()
        });
        delete result.scopes;
      };

      result.pub.getScopes = function() {
        if (!('scopes' in result))
          executeQueuedCommands();
        return result.scopes;
      };

      result.pub.setSelector = function(targetName, binding) {
        var operatorName;
        try {
          operatorName = binding.getOperator().getName();
        }
        catch (e) {
          throw 'operator: not an operator';
        }

        result.queueCommand('setSelector', {
          targetName: targetName,
          operator: operatorName,
          parameterLayout: binding.getParameterLayout()
        });
      };

      result.pub.preDescendBindings = result.preDescendBindings.pub;
      result.pub.postDescendBindings = result.postDescendBindings.pub;

      return result;
    };

    DG.getOrCreateNamedObject = function(name, type) {
      if (!(name in DG.namedObjects)) {
        switch (type) {
          case 'Operator':
            DG.createOperator(name);
            break;
          case 'Node':
            DG.createNode(name);
            break;
          case 'Event':
            DG.createEvent(name);
            break;
          case 'EventHandler':
            DG.createEventHandler(name);
            break;
          default:
            throw "unhandled type '" + type + "'";
        }
      }
      return DG.namedObjects[name];
    };

    DG.handleStateNotification = function(state) {
      DG.namedObjects = {};
      for (var namedObjectName in state) {
        var namedObjectState = state[namedObjectName];
        DG.getOrCreateNamedObject(namedObjectName, namedObjectState.type);
      }
      for (var namedObjectName in state) {
        DG.namedObjects[namedObjectName].patch(state[namedObjectName]);
      }
    };

    DG.handle = function(cmd, arg) {
      switch (cmd) {
        case 'log':
          if (logCallback) {
            logCallback(arg);
          }
          break;
        default:
          throw 'unrecognized';
      }
    };

    DG.route = function(src, cmd, arg) {
      if (src.length == 0) {
        try {
          DG.handle(cmd, arg);
        }
        catch (e) {
          throw "command '" + cmd + "': " + e;
        }
      }
      else {
        var namedObjectName = src.shift();
        var namedObjectType;
        if (typeof arg === 'object' && 'type' in arg)
          namedObjectType = arg.type;
        DG.getOrCreateNamedObject(namedObjectName, namedObjectType).route(src, cmd, arg);
      }
    };

    DG.pub = {
      createOperator: function(name) {
        var operator = DG.createOperator(name);
        DG.queueCommand([], 'createOperator', name, function() {
          operator.destroy();
        });
        return operator.pub;
      },
      createNode: function(name) {
        var node = DG.createNode(name);
        DG.queueCommand([], 'createNode', name, function() {
          node.destroy();
        });
        return node.pub;
      },
      createResourceLoadNode: function(name) {
        var node = DG.createResourceLoadNode(name);
        DG.queueCommand([], 'createResourceLoadNode', name, function() {
          node.destroy();
        });
        return node.pub;
      },
      createEvent: function(name) {
        var event = DG.createEvent(name);
        DG.queueCommand([], 'createEvent', name, function() {
          event.destroy();
        });
        return event.pub;
      },
      createEventHandler: function(name) {
        var eventHandler = DG.createEventHandler(name);
        DG.queueCommand([], 'createEventHandler', name, function() {
          eventHandler.destroy();
        });
        return eventHandler.pub;
      },

      createBinding: function() {
        var binding = DG.createBinding();
        return binding.pub;
      },

      getAllNamedObjects: function() {
        var result = {};
        for (var namedObjectName in DG.namedObjects) {
          result[namedObjectName] = DG.namedObjects[namedObjectName].pub;
        }
        return result;
      }
    };

    return DG;
  };
  var DG = createDG();

  var createEX = function() {
    var EX = {
      loadedExts: {},
      pub: {}
    };

    EX.patch = function(diff) {
      for (var name in diff) {
        if (diff[name])
          EX.loadedExts[name] = diff[name];
        else
          delete EX.loadedExts[name];
      }
    };

    EX.handleStateNotification = function(state) {
      EX.loadedExts = {};
      EX.patch(state);
    };

    EX.handle = function(cmd, arg) {
      switch (cmd) {
        case 'delta':
          EX.patch(arg);
          break;
        default:
          throw 'unrecognized';
      }
    };

    EX.route = function(src, cmd, arg) {
      if (src.length == 0) {
        try {
          EX.handle(cmd, arg);
        }
        catch (e) {
          throw "command '" + cmd + "': " + e;
        }
      }
      else
        throw 'unroutable';
    };

    EX.pub.getLoadedExts = function() {
      return EX.loadedExts;
    };

    return EX;
  };
  var EX = createEX();

  var createBuild = function() {
    var build = {
      pub: {}
    };

    build.patch = function(diff) {
      for (var name in diff) {
        build[name] = diff[name];
      }
    };

    build.handleStateNotification = function(state) {
      build.patch(state);
    };

    build.handle = function(cmd, arg) {
      switch (cmd) {
        case 'delta':
          build.patch(arg);
          break;
        default:
          throw 'unrecognized';
      }
    };

    build.route = function(src, cmd, arg) {
      if (src.length == 0) {
        try {
          build.handle(cmd, arg);
        }
        catch (e) {
          throw "command '" + cmd + "': " + e;
        }
      }
      else
        throw 'unroutable';
    };

    build.pub.isExpired = function() {
      return build.isExpired;
    };

    build.pub.getName = function() {
      return build.name;
    };

    build.pub.getPureVersion = function() {
      return build.pureVersion;
    };

    build.pub.getFullVersion = function() {
      return build.fullVersion;
    };

    build.pub.getDesc = function() {
      return build.desc;
    };

    build.pub.getCopyright = function() {
      return build.copyright;
    };

    build.pub.getURL = function() {
      return build.url;
    };

    build.pub.getOS = function() {
      return build.os;
    };

    build.pub.getArch = function() {
      return build.arch;
    };

    return build;
  };
  var build = createBuild();

  var state = {
  };

  var patch = function(diff) {
    if ('licenses' in diff)
      state.licenses = diff.licenses;
    if ('contextID' in diff)
      state.contextID = diff.contextID;
  };

  var createVP = function() {
    var VP = {
      viewPorts: {},
      pub: {}
    };

    VP.createViewPort = function(name) {
      var viewPort = {
        popUpMenuItems: {}
      };

      viewPort.patch = function(diff) {
        if ('width' in diff)
          viewPort.width = diff.width;

        if ('height' in diff)
          viewPort.height = diff.height;

        if ('windowNode' in diff)
          viewPort.windowNode = DG.namedObjects[diff.windowNode].pub;

        if ('redrawEvent' in diff)
          viewPort.redrawEvent = DG.namedObjects[diff.redrawEvent].pub;
      };

      viewPort.handle = function(cmd, arg) {
        switch (cmd) {
          case 'delta':
            viewPort.patch(arg);
            break;
          case 'redrawFinished':
            if (viewPort.redrawFinishedCallback)
              viewPort.redrawFinishedCallback();
            break;
          case 'popUpMenuItemSelected':
            if (arg in viewPort.popUpMenuItems)
              viewPort.popUpMenuItems[arg]();
            break;
          default:
            throw 'unrecognized';
        }
      };

      viewPort.route = function(src, cmd, arg) {
        if (src.length == 0) {
          try {
            viewPort.handle(cmd, arg);
          }
          catch (e) {
            throw "command '" + cmd + "': " + e;
          }
        }
        else
          throw 'unroutable';
      };

      viewPort.handleStateNotification = function(state) {
        viewPort.patch(state);
      };

      viewPort.queueCommand = function(cmd, arg, unwind, callback) {
        queueCommand(['VP', name], cmd, arg, unwind, callback);
      };

      viewPort.pub = {
        getName: function() {
          return name;
        },
        getWidth: function() {
          executeQueuedCommands();
          return viewPort.width;
        },
        getHeight: function() {
          executeQueuedCommands();
          return viewPort.height;
        },
        getFPS: function() {
          var fps = 0.0;
          viewPort.queueCommand('getFPS', null, function() {
          }, function(result) {
            fps = result;
          });
          executeQueuedCommands();
          return fps;
        },
        getWindowNode: function() {
          executeQueuedCommands();
          return viewPort.windowNode;
        },
        getRedrawEvent: function() {
          executeQueuedCommands();
          return viewPort.redrawEvent;
        },
        needsRedraw: function() {
          viewPort.queueCommand('needsRedraw');
          executeQueuedCommands();
        },
        setRedrawFinishedCallback: function(callback) {
          viewPort.redrawFinishedCallback = callback;
        },
        addPopUpMenuItem: function(name, desc, callback) {
          viewPort.popUpMenuItems[name] = callback;
          viewPort.queueCommand('addPopUpMenuItem', {
            desc: desc,
            arg: name
          });
        }
      };

      return viewPort;
    };

    VP.getOrCreateViewPort = function(viewPortName) {
      var viewPort = VP.viewPorts[viewPortName];
      if (!viewPort) {
        viewPort = VP.createViewPort(viewPortName);
        VP.viewPorts[viewPortName] = viewPort;
        VP.pub[viewPortName] = viewPort.pub;
      }
      return viewPort;
    };

    VP.handleStateNotification = function(newState) {
      for (var viewPortName in newState) {
        var viewPort = VP.getOrCreateViewPort(viewPortName);
        viewPort.handleStateNotification(newState[viewPortName]);
      }
    };

    VP.route = function(src, cmd, arg) {
      if (src.length > 0) {
        var viewPortName = src.shift();
        var viewPort = VP.getOrCreateViewPort(viewPortName);
        try {
          viewPort.route(src, cmd, arg);
        }
        catch (e) {
          throw "viewport '" + viewPortName + "': " + e;
        }
      }
      else {
        try {
          VP.handle(cmd, arg);
        }
        catch (e) {
          throw "command '" + cmd + "': " + e;
        }
      }
    };

    return VP;
  };
  var VP = createVP();

  var handleStateNotification = function(newState) {
    state = {};
    patch(newState);
    if ('build' in newState)
      build.handleStateNotification(newState.build);
    DG.handleStateNotification(newState.DG);
    RT.handleStateNotification(newState.RT);
    EX.handleStateNotification(newState.EX);
    if ('VP' in newState)
      VP.handleStateNotification(newState.VP);
  };

  var handle = function(cmd, arg) {
    try {
      switch (cmd) {
        case 'state':
          handleStateNotification(arg);
          break;
        default:
          throw 'unknown command';
      }
    }
    catch (e) {
      throw "command '" + cmd + "': " + e;
    }
  };

  var route = function(src, cmd, arg) {
    if (src.length == 0)
      handle(cmd, arg);
    else {
      var firstSrc = src.shift();

      switch (firstSrc) {
        case 'RT':
          try {
            RT.route(src, cmd, arg);
          }
          catch (e) {
            throw 'RT: ' + e;
          }
          break;
        case 'DG':
          try {
            DG.route(src, cmd, arg);
          }
          catch (e) {
            throw 'DG: ' + e;
          }
          break;
        case 'EX':
          try {
            EX.route(src, cmd, arg);
          }
          catch (e) {
            throw 'EX: ' + e;
          }
          break;
        case 'VP':
          try {
            VP.route(src, cmd, arg);
          }
          catch (e) {
            throw 'VP: ' + e;
          }
          break;
        default:
          throw 'unroutable';
      }
    }
  };

  fabricClient.setJSONNotifyCallback(function(jsonEncodedNotifications) {
    if (debugLogCallback)
      debugLogCallback('!! ' + jsonEncodedNotifications);

    var notifications;
    try {
      notifications = JSON.parse(jsonEncodedNotifications);
    }
    catch (e) {
      throw 'unable to parse JSON notifications';
    }

    var size = notifications.length;
    for (var i = 0; i < size; ++i) {
      var notification = notifications[i];
      try {
        var src = notification.src;
        var cmd = notification.cmd;
        var arg = notification.arg;
        route(src, cmd, arg);
      }
      catch (e) {
        throw 'notification ' + i + ': ' + e;
      }
    }
  });

  return {
    build: build.pub,
    RT: RT.pub,
    RegisteredTypesManager: RT.pub,
    DG: DG.pub,
    EX: EX.pub,
    DependencyGraph: DG.pub,
    VP: VP.pub,
    getLicenses: function() {
      return state.licenses;
    },
    getContextID: function() {
      return state.contextID;
    },
    flush: function() {
      executeQueuedCommands();
    }
  };
};
