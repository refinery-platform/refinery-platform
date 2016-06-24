'use strict';

function NodeGroupCtrl (
  $log,
  $scope,
  $window,
  fileBrowserFactory
  ) {
  var vm = this;
  vm.nodeGroupList = [];
  $scope.selectedNodeGroup = { select: vm.nodeGroupList[0] };

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
    console.log('updateCurrentNodeGroup');
  };

  console.log('in the ctrl');
  vm.refreshNodeGroupList();
}

angular
  .module('refineryFileBrowser')
  .controller('NodeGroupCtrl',
  [
    '$log',
    '$scope',
    '$window',
    'fileBrowserFactory',
    NodeGroupCtrl
  ]);
