'use strict';

function selectedNodesService ($window, selectedFilterService) {
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

  /**
   * Manually keep track of selected nodes which is neccessary due to dynamic
   * scrolling in the ui-grid
   * @param {obj} nodeRow - ui-grid row obj
   * */
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
    // else nothing because it is not in current block of data
    return vm.selectedNodes;
  };

   /**
   * Deep copy of a list of node uuids to the selected uuids from node group
   * @param {list} nodesUuidsList - list of uuids
   */
  vm.setSelectedNodesUuidsFromNodeGroup = function (nodesUuidsList) {
    angular.copy(nodesUuidsList, vm.selectedNodesUuidsFromNodeGroup);
    return vm.selectedNodesUuidsFromNodeGroup;
  };

  /**
   * Helper method create ui-grid like objects to match with rows in ui-grid
   * @param {list} nodesUuidsList - list of uuids
   */
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

   /**
   * Flag for when select all event checkbox is selected or resets all
    * variables when deselected
   * @param {boolean} flag - false will reset selections
   */
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

  /**
   * These are non-selected nodes uuid, when the select all flag is true
   * @param {obj} nodeRow - ui-grid row object or ui-grid structured row objects
   */
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

   /**
   * Resets Node Group UI-Select menu to default Current Selection
   * @param {boolean} flag - resets boolean
   */
  vm.resetNodeGroupSelection = function (flag) {
    if (flag && vm.selectedNodeGroupUuid !== vm.defaultCurrentSelectionUuid) {
      vm.selectedNodeGroupUuid = vm.defaultCurrentSelectionUuid;
      vm.resetNodeGroup = true;
    } else {
      vm.resetNodeGroup = false;
    }
  };

   // Generates node group params
  vm.getNodeGroupParams = function () {
    var params = {
      uuid: vm.selectedNodeGroupUuid,
      assay: $window.externalAssayUuid,
      study: $window.externalStudyUuid
    };
    // Select all box is checked, complement uuids sent & backend grabs uuids
    if (vm.selectedAllFlag) {
      params.nodes = vm.complementSelectedNodesUuids;
      params.use_complement_nodes = true;
      params.filter_attribute = selectedFilterService.attributeSelectedFields;
    } else {
      params.nodes = vm.selectedNodesUuids;
      params.use_complement_nodes = false;
    }
    return params;
  };


  // Used by ctrls for node-group and launch-analysis partials to designate
  // whether any nodes are selected.
  vm.isNodeSelectionEmpty = function () {
    var params = vm.getNodeGroupParams();
    if (params.nodes.length === 0 && !params.use_complement_nodes) {
      return true;
    }
    return false;
  };
}

angular.module('refineryFileBrowser')
  .service('selectedNodesService', [
    '$window',
    'selectedFilterService',
    selectedNodesService
  ]
);
