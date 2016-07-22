'use strict';

function selectedNodesService () {
  var vm = this;
  vm.selectedNodes = [];
  vm.selectedNodeUuids = [];
  vm.selectedNodeUuidsFromNodeGroup = [];
  vm.selectedAllFlag = false;
  vm.complementSelectedNodes = [];
  vm.complementSelectedNodesUuids = [];
  vm.nodeGroupUuid = '';
  vm.currentSelectionUuid = '';
  vm.resetNodeGroup = false;

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

  // create ui-grid like objects to match with rows in ui-gride
  vm.setSelectedNodesFromNodeGroup = function (nodesUuidsList) {
    angular.forEach(nodesUuidsList, function (uuid) {
      vm.setSelectedNodes(
        {
          entity: { uuid: uuid },
          isSelected: true
        }
      );
    });
    return vm.selectedNodes;
  };

  // Flag for when select all event checkbox is selected
  vm.setSelectedAllFlags = function (flag) {
    if (flag) {
      vm.selectedAllFlag = flag;
    } else {
      // flag is false, reset complement selected nodes
      vm.selectedAllFlag = flag;
      vm.complementSelectedNodes = [];
      vm.complementSelectedNodesUuids = [];
      vm.selectedNodes = [];
      vm.selectedNodeUuids = [];
      vm.selectedNodeUuidsFromNodeGroup = [];
    }
  };

  // These are non-selected nodes uuid, when the select all flag is true
  vm.setComplementSeletedNodes = function (nodeRow) {
    var ind = vm.complementSelectedNodesUuids.indexOf(nodeRow.entity.uuid);
    if (nodeRow.isSelected === false) {
      if (ind === -1) {
        vm.complementSelectedNodes.push(nodeRow);
        vm.complementSelectedNodesUuids.push(nodeRow.entity.uuid);
      }
      // Have to set explictly to keep deleted rows from infinite scrolling
    } else if (nodeRow.isSelected === true) {
      if (ind > -1) {
        vm.complementSelectedNodes.splice(ind, 1);
        vm.complementSelectedNodesUuids.splice(ind, 1);
      }
    }
    // else nothing should occur to nodeRow because it is not in assayFiles
    return vm.complementSelectedNodes;
  };

  vm.resetNodeGroupSelection = function (flag) {
    if (flag) {
      vm.nodeGroupUuid = vm.currentSelectionUuid;
    }
    vm.resetNodeGroup = flag;
  };
}

angular.module('refineryFileBrowser')
  .service('selectedNodesService', [
    selectedNodesService
  ]
);
