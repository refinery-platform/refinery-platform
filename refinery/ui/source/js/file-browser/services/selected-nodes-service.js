'use strict';

function selectedNodesService ($window, fileBrowserFactory, selectedFilterService) {
  var vm = this;
  vm.selectedNodes = [];
  vm.selectedNodesUuids = [];
  vm.selectedNodesUuidsFromNodeGroup = [];
  vm.selectedAllFlag = false;
  vm.complementSelectedNodes = [];
  vm.complementSelectedNodesUuids = [];
  vm.selectedNodeGroupUuid = '';
  vm.defaultCurrentSelectionUuid = '';
  vm.resetNodeGroup = false;

  // Manual keep track of selected nodes, due to dynamic scrolling
  vm.setSelectedNodes = function (nodeRow) {
    var ind = vm.selectedNodesUuids.indexOf(nodeRow.entity.uuid);
    if (nodeRow.isSelected) {
      if (ind === -1) {
        vm.selectedNodes.push(nodeRow);
        vm.selectedNodesUuids.push(nodeRow.entity.uuid);
      }
      // Have to set explictly to keep deleted rows from infinite scrolling
    } else if (nodeRow.isSelected === false) {
      if (ind > -1) {
        vm.selectedNodesUuids.splice(ind, 1);
        vm.selectedNodes.splice(ind, 1);
      }
    }
    // else nothing should occur to nodeRow because it is not in assayFiles
    return vm.selectedNodes;
  };

  vm.setSelectedNodesUuidsFromNodeGroup = function (nodesUuidsList) {
    angular.copy(nodesUuidsList, vm.selectedNodesUuidsFromNodeGroup);
    return vm.selectedNodesUuidsFromNodeGroup;
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
      vm.selectedNodesUuids = [];
      vm.selectedNodesUuidsFromNodeGroup = [];
      vm.selectedNodeGroupUuid = vm.defaultCurrentSelectionUuid;
      vm.resetNodeGroup = false;
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
    if (flag && vm.selectedNodeGroupUuid !== vm.defaultCurrentSelectionUuid) {
      vm.selectedNodeGroupUuid = vm.defaultCurrentSelectionUuid;
      vm.resetNodeGroup = true;
    } else {
      vm.resetNodeGroup = false;
    }
  };

  // If select all box is checked, the complements are sent and backend
  // generates nodes list
  vm.getNodeGroupParams = function () {
    var params = {
      uuid: vm.selectedNodeGroupUuid,
      assay: $window.externalAssayUuid,
      study: $window.externalStudyUuid
    };
    if (vm.selectedAllFlag) {
      params.nodes = vm.complementSelectedNodesUuids;
      params.use_complement_nodes = true;
      params.filter_attribute = fileBrowserFactory.encodeAttributeFields(
        selectedFilterService.selectedFieldList
      );
    } else {
      params.nodes = vm.selectedNodesUuids;
      params.use_complement_nodes = false;
    }
    return params;
  };
}

angular.module('refineryFileBrowser')
  .service('selectedNodesService', [
    '$window',
    'fileBrowserFactory',
    'selectedFilterService',
    selectedNodesService
  ]
);
