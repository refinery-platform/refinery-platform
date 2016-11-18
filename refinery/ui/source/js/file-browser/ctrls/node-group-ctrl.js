'use strict';

function NodeGroupCtrl (
  $log,
  $q,
  $scope,
  $window,
  fileBrowserFactory,
  resetGridService,
  selectedNodeGroupService,
  selectedNodesService
  ) {
  var vm = this;
  vm.nodeGroups = {
    groups: fileBrowserFactory.nodeGroupList
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

    var promise = $q.defer();
    fileBrowserFactory.getNodeGroupList(assayUuid).then(function () {
      vm.nodeGroups.groups = fileBrowserFactory.nodeGroupList;
      // Current Selection node is first returned
      selectedNodesService.defaultCurrentSelectionUuid = vm.nodeGroups.groups[0].uuid;
      selectedNodesService.selectedNodeGroupUuid = selectedNodesService.defaultCurrentSelectionUuid;
      promise.resolve();
    }, function (error) {
      $log.error(error);
    });
    return promise.promise;
  };

  // Update selected nodes when new node group is selected
  vm.selectCurrentNodeGroupNodes = function () {
    selectedNodesService.setSelectedAllFlags(false);
    // Copy node group nodes uuids to service
    selectedNodesService.setSelectedNodesUuidsFromNodeGroup(vm.nodeGroups.selected.nodes);
    selectedNodesService.selectedNodeGroupUuid = vm.nodeGroups.selected.uuid;
    resetGridService.setResetGridFlag(true);
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
  // Watcher to update service with selected node group
  $scope.$watch(
    function () {
      return vm.nodeGroups.selected;
    },
    function () {
      selectedNodeGroupService.setSelectedNodeGroup(vm.nodeGroups.selected);
      selectedNodesService.selectedNodeGroupUuid = vm.nodeGroups.selected.uuid;
    }
  );

  // Watcher to reset node group when flag triggers
  $scope.$watch(
    function () {
      return selectedNodesService.resetNodeGroup;
    },
    function () {
      if (selectedNodesService.resetNodeGroup) {
        selectedNodeGroupService.setSelectedNodeGroup(vm.nodeGroups.groups[0]);
        vm.nodeGroups.selected = selectedNodeGroupService.selectedNodeGroup;
        selectedNodesService.selectedNodeGroupUuid = vm.nodeGroups.selected.uuid;
        selectedNodesService.resetNodeGroupSelection(false);
      }
    }
  );

  // initialize service data
  if (fileBrowserFactory.nodeGroupList.length === 0) {
    vm.refreshNodeGroupList().then(function () {
      selectedNodeGroupService.setSelectedNodeGroup(vm.nodeGroups.groups[0]);
    });
  }
}

angular
  .module('refineryFileBrowser')
  .controller('NodeGroupCtrl',
  [
    '$log',
    '$q',
    '$scope',
    '$window',
    'fileBrowserFactory',
    'resetGridService',
    'selectedNodeGroupService',
    'selectedNodesService',
    NodeGroupCtrl
  ]);

