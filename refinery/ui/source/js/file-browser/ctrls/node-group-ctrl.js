'use strict';

function NodeGroupCtrl (
  fileBrowserFactory,
  $q,
  $log,
  $window,
  $scope,
  resetGridService,
  selectedNodeGroupService,
  selectedNodesService
  ) {
  var vm = this;
  vm.nodeGroups = {
    groups: []
  };
  vm.nodeGroups.selected = selectedNodeGroupService.selectedNodeGroup;

/*
 * -----------------------------------------------------------------------------
 * Methods
 * -----------------------------------------------------------------------------
 */

  // Main method to refresh attribute lists when modal opens
  vm.refreshNodeGroupList = function () {
    var assayUuid = $window.externalAssayUuid;
    fileBrowserFactory.getNodeGroupList(assayUuid).then(function () {
      vm.nodeGroups.groups = fileBrowserFactory.nodeGroupList;
      // Current Selection node is first returned
      vm.nodeGroups.selected = selectedNodeGroupService.selectedNodeGroup;
      selectedNodesService.defaultCurrentSelectionUuid = vm.nodeGroups.groups[0].uuid;
      selectedNodesService.selectedNodeGroupUuid = selectedNodesService.defaultCurrentSelectionUuid;
    }, function (error) {
      $log.error(error);
    });
  };

  // Update selected nodes when new node group is selected
  vm.selectCurrentNodeGroupNodes = function () {
    selectedNodesService.setSelectedAllFlags(false);
    // Copy node group nodes uuids to service
    selectedNodesService.setSelectedNodesUuidsFromNodeGroup(vm.nodeGroups.selected.nodes);
    selectedNodesService.selectedNodeGroupUuid = vm.nodeGroups.selected.uuid;
    resetGridService.setResetGridFlag(true);
  };

  // Create a new node group
  vm.saveNodeGroup = function (name) {
    var params = selectedNodesService.getNodeGroupParams();
    params.name = name;
    fileBrowserFactory.createNodeGroup(params).then(function () {
      vm.refreshNodeGroupList();
    });
  };

  // RESET button: Clear selected nodes and node group selection
  vm.clearSelectedNodes = function () {
    // Deselects node group
    selectedNodeGroupService.setSelectedNodeGroup(vm.nodeGroups.groups[0]);
    vm.nodeGroups.selected = selectedNodeGroupService.selectedNodeGroup;
    selectedNodesService.setSelectedAllFlags(false);
    resetGridService.setResetGridFlag(true);
  };

  // helper method checking if any nodes are selected
  vm.isNodeGroupSelectionEmpty = function () {
    return selectedNodesService.isNodeSelectionEmpty();
  };

/*
 * -----------------------------------------------------------------------------
 * Watchers and Method Calls
 * -----------------------------------------------------------------------------
 */
  $scope.$watch(
    function () {
      return selectedNodesService.resetNodeGroup;
    },
    function () {
      if (selectedNodesService.resetNodeGroup) {
        selectedNodeGroupService.setSelectedNodeGroup(vm.nodeGroups.groups[0]);
        vm.nodeGroups.selected = selectedNodeGroupService.selectedNodeGroup;
        selectedNodesService.resetNodeGroupSelection(false);
      }
    }
  );

  // initialize service data
  selectedNodeGroupService.setSelectedNodeGroup(vm.nodeGroups.groups[0]);
}

angular
  .module('refineryFileBrowser')
  .controller('NodeGroupCtrl',
  [
    'fileBrowserFactory',
    '$q',
    '$log',
    '$window',
    '$scope',
    'resetGridService',
    'selectedNodeGroupService',
    'selectedNodesService',
    NodeGroupCtrl
  ]);

