'use strict';

function selectedNodesService () {
  var vm = this;
  vm.selectedNodes = [];
  vm.selectedNodesUuids = [];

  vm.setSelectedNodes = function (nodesList) {
    vm.selectedNodes = [];
   // avoid angular.copy because $$hashkeys are not copied
    angular.forEach(nodesList, function (node) {
      vm.selectedNodes.push(node);
    });
    return vm.selectedNodes;
  };

  vm.setSelectedNodesUuids = function (nodesUuidsList) {
    angular.copy(nodesUuidsList, vm.selectedNodesUuids);
    return vm.selectedNodesUuidsList;
  };
}

angular.module('refineryFileBrowser')
  .service('selectedNodesService', [
    selectedNodesService
  ]
);
