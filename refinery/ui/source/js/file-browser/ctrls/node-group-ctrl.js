'use strict';

function NodeGroupCtrl (
  fileBrowserFactory,
  $q,
  $log,
  $window,
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
      vm.nodeGroups.selected = vm.nodeGroups.groups[0];
    }, function (error) {
      $log.error(error);
    });
  };

  // Update selected nodes when new node group is selected
  vm.selectCurrentNodeGroupNodes = function () {
    selectedNodesService.setSelectedNodeUuidsFromNodeGroup(vm.nodeGroups.selected.nodes);
    resetGridService.setResetGridFlag(true);
  };

  // Create a new node group
  vm.saveNodeGroup = function (name) {
    var params = {
      name: name,
      assay: $window.externalAssayUuid,
      study: $window.externalStudyUuid
    };

    // If select all box is checked, the complements are sent and backend
    // generates nodes list
    if (selectedNodesService.selectedAllFlag) {
      params.nodes = selectedNodesService.complementSelectedNodes;
      params.use_complement_nodes = true;
    } else {
      params.nodes = selectedNodesService.selectedNodeUuidsFromUI;
      params.use_complement_nodes = false;
    }
    fileBrowserFactory.createNodeGroup(params).then(function () {
      vm.refreshNodeGroupList();
    });
  };

  // Helper method to clear selected nodes and node group selection
  vm.clearSelectedNodes = function () {
    // Deselects node group
    vm.nodeGroups.selected = vm.nodeGroups.groups[0];
    // Empties nodes uuids list used when grids are reset
    selectedNodesService.setSelectedNodeUuidsFromNodeGroup([]);
    // Empties selected nodes used when grids are reset
    selectedNodesService.setSelectedNodes([]);
    resetGridService.setResetGridFlag(true);
  };
}

angular
  .module('refineryFileBrowser')
  .controller('NodeGroupCtrl',
  [
    'fileBrowserFactory',
    '$q',
    '$log',
    '$window',
    'resetGridService',
    'selectedNodesService',
    NodeGroupCtrl
  ]);

