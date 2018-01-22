'use strict';

function AboutSharingCtrl (
  dataSetPermsService,
  userService,
  $scope,
  $location,
  $window,
  $log,
  _
  ) {
  var vm = this;
  vm.dataSetSharing = dataSetPermsService.dataSetSharing;
  vm.groupList = dataSetPermsService.groupList;
  vm.ownerName = dataSetPermsService.ownerName;

  vm.refreshDataSetSharing = function () {
    var dataSetUuid = $window.dataSetUuid;

    dataSetPermsService
      .getDataSetSharing(dataSetUuid)
      .then(function () {
        vm.dataSetSharing = dataSetPermsService.dataSetSharing;
        vm.groupList = dataSetPermsService.groupList;
        vm.refreshOwnerName(vm.dataSetSharing.owner);
      }, function (error) {
        $log.error(error);
      });
  };

  vm.refreshOwnerName = function (userUuid) {
    userService.get(userUuid).then(function (response) {
      if (_.has(response, 'fullName') && response.fullName) {
        dataSetPermsService.ownerName = response.fullName;
      } else if (_.has(response, 'userName') && response.userName) {
        dataSetPermsService.ownerName = response.userName;
      }
      vm.ownerName = dataSetPermsService.ownerName;
    });
  };

  vm.refreshDataSetSharing();
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
    '_',
    AboutSharingCtrl
  ]);

