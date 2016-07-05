'use strict';

function selectedNodesService () {
  var vm = this;
  vm.selectedNodes = [];
  vm.selectedNodeUuidsFromUI = [];
  vm.selectedNodeUuidsFromNodeGroup = [];

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

  vm.getUuidsFromSelectedNodesInUI = function () {
    var uuidsList = [];
    angular.forEach(vm.selectedNodes, function (node) {
      uuidsList.push(node.uuid);
    });
    vm.setSelectedNodeUuidsFromUI(uuidsList);
  };
}

angular.module('refineryFileBrowser')
  .service('selectedNodesService', [
    selectedNodesService
  ]
);
