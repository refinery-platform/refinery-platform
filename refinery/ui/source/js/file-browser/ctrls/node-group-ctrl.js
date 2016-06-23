'use strict';

function NodeGroupCtrl (
  $log,
  $window,
  fileBrowserFactory
  ) {
  var vm = this;
  vm.nodeGroupList = [];

  // Refresh attribute lists when modal opens
  vm.refreshNodeGroupList = function () {
    var assayUuid = $window.externalAssayUuid;

    fileBrowserFactory.getNodeGroupList(assayUuid).then(function () {
      vm.nodeGroupList = fileBrowserFactory.nodeGroupList;
    }, function (error) {
      $log.error(error);
    });
  };

  console.log('in the ctrl');
  vm.refreshNodeGroupList();
}

angular
  .module('refineryFileBrowser')
  .controller('NodeGroupCtrl',
  [
    '$log',
    '$window',
    'fileBrowserFactory',
    NodeGroupCtrl
  ]);
