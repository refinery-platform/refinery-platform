'use strict';

function AboutSharingCtrl (
  dataSetPermsService,
  userService,
  $scope,
  $location,
  $window,
  $log
  ) {
  var vm = this;
  vm.groupList = dataSetPermsService.groupList;

  // update group list perms

  vm.refreshDataSetGroups = function () {
    var dataSetUuid = $window.dataSetUuid;

    dataSetPermsService
      .getDataSetSharing(dataSetUuid)
      .then(function () {
        vm.groupList = dataSetPermsService.groupList;
      }, function (error) {
        $log.error(error);
      });
  };

  vm.refreshDataSetGroups();
}


angular
  .module('refineryDataSetAbout')
  .controller('AboutSharingCtrl',
  [
    'dataSetPermsService',
    'userService',
    '$scope',
    '$location',
    '$window',
    '$log',
    AboutSharingCtrl
  ]);

