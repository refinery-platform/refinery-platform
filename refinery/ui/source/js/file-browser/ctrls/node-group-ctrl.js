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
  vm.selectedNodeGroup = { select: vm.nodeGroupList[0] };

  // Refresh attribute lists when modal opens
  vm.refreshNodeGroupList = function () {
    var assayUuid = $window.externalAssayUuid;

    fileBrowserFactory.getNodeGroupList(assayUuid).then(function () {
      vm.nodeGroupList = fileBrowserFactory.nodeGroupList;
    }, function (error) {
      $log.error(error);
    });
  };

  vm.selectCurrentNodeGroup = function () {
    selectedNodesService.setSelectedNodesUuids(vm.selectedNodeGroup.select.nodes);
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

