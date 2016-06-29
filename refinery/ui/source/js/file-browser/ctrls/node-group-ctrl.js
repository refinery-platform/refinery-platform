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

  vm.updateCurrentNodeGroup = function () {
    console.log('in updateCurrentNodeGroup');
    console.log('lets reset');
    console.log(vm.selectedNodeGroup.select);
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

