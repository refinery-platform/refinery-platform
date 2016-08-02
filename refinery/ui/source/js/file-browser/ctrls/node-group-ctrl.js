'use strict';

function NodeGroupCtrl (
  fileBrowserFactory,
  $q,
  $log,
  $window,
  $scope,
  resetGridService,
  selectedNodesService
  ) {
  var vm = this;
  vm.nodeGroups = {
    groups: []
  };
  vm.nodeGroups.selected = vm.nodeGroups.groups[0];

  // Refresh attribute lists when modal opens
  vm.refreshNodeGroupList = function () {
    var assayUuid = $window.externalAssayUuid;
    fileBrowserFactory.getNodeGroupList(assayUuid).then(function () {
      vm.nodeGroups.groups = fileBrowserFactory.nodeGroupList;
      // Current Selection node is first returned
      vm.nodeGroups.selected = vm.nodeGroups.groups[0];
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
    vm.nodeGroups.selected = vm.nodeGroups.groups[0];
    selectedNodesService.setSelectedAllFlags(false);
    resetGridService.setResetGridFlag(true);
  };

  vm.emptySelectionFlag = function () {
    var params = selectedNodesService.getNodeGroupParams();
    if (params.nodes.length !== 0 || params.use_complement_nodes) {
      return false;
    }
    return true;
  };

  $scope.$watch(
    function () {
      return selectedNodesService.resetNodeGroup;
    },
    function () {
      if (selectedNodesService.resetNodeGroup) {
        vm.nodeGroups.selected = vm.nodeGroups.groups[0];
        selectedNodesService.resetNodeGroupSelection(false);
      }
    }
  );
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
    'selectedNodesService',
    NodeGroupCtrl
  ]);

