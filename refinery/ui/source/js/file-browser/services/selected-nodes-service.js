'use strict';

function selectedNodesService () {
  var vm = this;
  vm.selectedNodes = [];
  vm.selectedNodeUuids = [];
  vm.selectedNodeUuidsFromNodeGroup = [];
  vm.selectedAllFlag = false;
  vm.complementSelectedNodes = [];
  vm.complementSelectedNodesUuidsFromUI = [];

  // Manual keep track of selected nodes, due to dynamic scrolling
  vm.setSelectedNodes = function (nodeRow) {
    var ind = vm.selectedNodeUuids.indexOf(nodeRow.entity.uuid);
    if (nodeRow.isSelected) {
      if (ind === -1) {
        vm.selectedNodes.push(nodeRow);
        vm.selectedNodeUuids.push(nodeRow.entity.uuid);
      }
      // Have to set explictly to keep deleted rows from infinite scrolling
    } else if (nodeRow.isSelected === false) {
      if (ind > -1) {
        vm.selectedNodeUuids.splice(ind, 1);
        vm.selectedNodes.splice(ind, 1);
      }
    }
    // else nothing should occur to nodeRow because it is not in assayFiles
    return vm.selectedNodes;
  };

  vm.setSelectedNodeUuidsFromNodeGroup = function (nodesUuidsList) {
    angular.copy(nodesUuidsList, vm.selectedNodeUuidsFromNodeGroup);
    return vm.selectedNodeUuidsFromNodeGroup;
  };

  // Flag for when select all event checkbox is selected
  vm.setSelectedAllFlags = function (flag) {
    if (flag) {
      vm.selectedAllFlag = flag;
    } else {
      // flag is false, reset complement selected nodes
      vm.selectedAllFlag = flag;
      vm.complementSelectedNodes = [];
      vm.complementSelectedNodesUuidsFromUI = [];
      vm.selectedNodes = [];
      vm.selectedNodeUuids = [];
      vm.selectedNodeUuidsFromNodeGroup = [];
    }
  };

  // These are non-selected nodes uuid, when the select all flag is true
  vm.setComplementSeletedNodes = function (nodeRow) {
    if (vm.complementSelectedNodesUuidsFromUI.indexOf(nodeRow.entity.uuid) === -1) {
      vm.complementSelectedNodes.push(nodeRow);
      vm.complementSelectedNodesUuidsFromUI.push(nodeRow.entity.uuid);
    }
    return vm.complementSelectedNodes;
  };
}

angular.module('refineryFileBrowser')
  .service('selectedNodesService', [
    selectedNodesService
  ]
);
