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
  vm.nodeGroupList = [];
  vm.nodeGroupList.selected = vm.nodeGroupList[0];

  // Refresh attribute lists when modal opens
  vm.refreshNodeGroupList = function () {
    var assayUuid = $window.externalAssayUuid;
    var promise = $q.defer();

    fileBrowserFactory.getNodeGroupList(assayUuid).then(function () {
      vm.nodeGroupList = fileBrowserFactory.nodeGroupList;

      // Default set the node group list to be current selection
      if (vm.nodeGroupList.length > 0) {
        vm.nodeGroupList.selected = vm.nodeGroupList[0];
      }
      promise.resolve();
    }, function (error) {
      $log.error(error);
      promise.reject();
    });
    return promise.promise;
  };

  vm.selectCurrentNodeGroup = function () {
    selectedNodesService.setSelectedNodeUuidsFromNodeGroup(vm.nodeGroupList.selected.nodes);
    resetGridService.setResetGridFlag(true);
  };

  vm.saveNodeGroup = function (name) {
    var params = {
      name: name,
      assay: $window.externalAssayUuid,
      study: $window.externalStudyUuid,
      nodes: selectedNodesService.selectedNodeUuidsFromUI
    };
    fileBrowserFactory.createNodeGroup(params).then(function () {
      vm.refreshNodeGroupList().then(function () {
        vm.nodeGroupList.selected = vm.nodeGroupList[vm.nodeGroupList.length - 1];
      });
    }, function (error) {
      $log.error(error);
    });
  };

  vm.clearSelectedNodes = function () {
    // Deselects node group
    vm.nodeGroupList.selected = undefined;
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

