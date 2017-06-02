'use strict';

function AboutSharingCtrl (
  dataSetAboutFactory,
  userService,
  $scope,
  $location,
  $window,
  $log
  ) {
  var vm = this;
  vm.dataSetSharing = dataSetAboutFactory.dataSetSharing;
  vm.groupList = dataSetAboutFactory.groupList;
  vm.ownerName = '';

  vm.refreshDataSetSharing = function () {
    var dataSetUuid = $window.dataSetUuid;

    dataSetAboutFactory
      .getDataSetSharing(dataSetUuid)
      .then(function () {
        vm.dataSetSharing = dataSetAboutFactory.dataSetSharing;
        vm.groupList = dataSetAboutFactory.groupList;
        vm.refreshOwnerName(vm.dataSetSharing.owner);
      }, function (error) {
        $log.error(error);
      });
  };

  vm.refreshOwnerName = function (userUuid) {
    userService.get(userUuid).then(function (response) {
      if (response.fullName) {
        vm.ownerName = response.fullName;
      } else {
        vm.ownerName = response.userName;
      }
    });
  };

  vm.refreshDataSetSharing();
}


angular
  .module('refineryDataSetAbout')
  .controller('AboutSharingCtrl',
  [
    'dataSetAboutFactory',
    'userService',
    '$scope',
    '$location',
    '$window',
    '$log',
    AboutSharingCtrl
  ]);

