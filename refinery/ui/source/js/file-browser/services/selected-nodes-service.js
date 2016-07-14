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
    console.log('just in the set selected nodes');
    console.log(nodeRow);
    var ind = vm.selectedNodeUuids.indexOf(nodeRow.entity.uuid);
    console.log(vm.selectedNodes);
    console.log(vm.selectedNodeUuids);
    console.log('select node');
   // console.log(nodeRow);
    if (nodeRow.isSelected) {
      if (ind === -1) {
        console.log('true');
     //   console.log(nodeRow);
        vm.selectedNodes.push(nodeRow);
        vm.selectedNodeUuids.push(nodeRow.entity.uuid);
        console.log(vm.selectedNodeUuids);
        console.log(vm.selectedNodes);
      }
      // Have to set explictly to keep deleted rows from infinite scrolling
    } else if (nodeRow.isSelected === false) {
      console.log('false');
      console.log(nodeRow);
      console.log(nodeRow.entity);
      if (ind > -1) {
        console.log('in the ind');
        console.log(vm.selectedNodeUuids);
        console.log(vm.selectedNodes);
        vm.selectedNodeUuids.splice(ind, 1);
        vm.selectedNodes.splice(ind, 1);
      }
    }

    return vm.selectedNodes;
  };

  vm.setSelectedNodeUuidsFromNodeGroup = function (nodesUuidsList) {
    console.log('in set selected node uuids from node group');
    console.log(vm.selectedNodeUuidsFromNodeGroup);
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
