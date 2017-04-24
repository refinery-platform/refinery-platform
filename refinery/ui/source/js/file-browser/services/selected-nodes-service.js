'use strict';

function selectedNodesService ($window, selectedFilterService) {
  var vm = this;
  vm.selectedAllFlag = false;
  vm.selectedNodeGroupUuid = '';
  vm.defaultCurrentSelectionUuid = '';
  vm.resetNodeGroup = false;
  vm.activeNodeRow = {}; // ui-grid node which is selected, shared btwn modules
  // ui-grid maintains checkboxes for popover selection,
  // {groupId: {inputFileTypeUuid_1: { nodeUuid: booleanValue }}}
  vm.selectionObj = {};

  /**
   * When a group is removed/clear, this will deselect all associated nodes
   * from the ui-grid selection obj
   * @param {str} groupId - string with group Id ex, '[0,0,0]'
   * */
  vm.deselectGroupFromSelectionObj = function (groupId) {
    angular.forEach(vm.selectionObj[groupId], function (inputObj, inputUuid) {
      angular.forEach(inputObj, function (selectionValue, nodeUuid) {
        vm.selectionObj[groupId][inputUuid][nodeUuid] = false;
      });
    });
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
      vm.selectionObj = {};
      vm.selectedNodesUuids = [];
      vm.selectedNodesUuidsFromNodeGroup = [];
      vm.selectedNodeGroupUuid = vm.defaultCurrentSelectionUuid;
      vm.resetNodeGroup = false;
    }
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
}

angular.module('refineryFileBrowser')
  .service('selectedNodesService', [
    '$window',
    'selectedFilterService',
    selectedNodesService
  ]
);
