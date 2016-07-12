'use strict';

function selectedNodesService () {
  var vm = this;
  vm.selectedNodes = [];
  vm.selectedNodeUuidsFromUI = [];
  vm.selectedNodeUuidsFromNodeGroup = [];
  vm.selectedAllFlag = false;
  vm.complementSelectedNodes = [];
  vm.complementSelectedNodesUuidsFromUI = [];

  vm.setSelectedNodes = function (nodesList) {
    vm.selectedNodes = [];
   // avoid angular.copy because $$hashkeys are not copied
    angular.forEach(nodesList, function (node) {
      vm.selectedNodes.push(node);
    });
    return vm.selectedNodes;
  };

  vm.setSelectedNodeUuidsFromUI = function (nodesUuidsListUI) {
    angular.copy(nodesUuidsListUI, vm.selectedNodeUuidsFromUI);
    return vm.selectedNodeUuidsFromUI;
  };

  vm.setSelectedNodeUuidsFromNodeGroup = function (nodesUuidsList) {
    angular.copy(nodesUuidsList, vm.selectedNodeUuidsFromNodeGroup);
    return vm.selectedNodeUuidsFromNodeGroup;
  };

  // Grabs uuids from UI-Grid row objects
  vm.getUuidsFromSelectedNodesInUI = function () {
    var uuidsList = [];
    angular.forEach(vm.selectedNodes, function (node) {
      uuidsList.push(node.uuid);
    });
    vm.setSelectedNodeUuidsFromUI(uuidsList);
  };

  // Flag for when select all event checkbox is selected
  vm.setSelectedAllFlags = function (flag) {
    if (flag) {
      vm.selectedAllFlag = flag;
    } else {
      // flag is false, reset complement selected nodes
      vm.selectedAllFlag = flag;
      vm.complementSelectedNodes = [];
    }
  };

  // These are non-selected nodes uuid, when the select all flag is true
  vm.setComplementSeletedNodes = function (nodeRow) {
    if (vm.complementSelectedNodesUuidsFromUI.indexOf(nodeRow.uuid) === -1) {
      vm.complementSelectedNodes.push(nodeRow);
      vm.complementSelectedNodesUuidsFromUI.push(nodeRow.uuid);
    }
    return vm.complementSelectedNodes;
  };
}

angular.module('refineryFileBrowser')
  .service('selectedNodesService', [
    selectedNodesService
  ]
);
