'use strict';

function AboutSharingCtrl (
  dataSetAboutFactory,
  $scope,
  $location,
  $window,
  $log
  ) {
  var vm = this;
  vm.dataSetSharing = dataSetAboutFactory.dataSetSharing.share_list;
  vm.ownerName = dataSetAboutFactory.ownerName;
  vm.groupList = dataSetAboutFactory.dataSetSharing.share_list;

  vm.refreshDataSetSharing = function () {
    var dataSetUuid = $window.dataSetUuid;

    dataSetAboutFactory
      .getDataSetSharing(dataSetUuid)
      .then(function () {
        vm.groupList = dataSetAboutFactory.dataSetSharing.share_list;
        vm.refreshOwnerName(vm.dataSetSharing.owner);
      }, function (error) {
        $log.error(error);
      });
  };

  vm.refreshOwnerName = function (userUuid) {
    dataSetAboutFactory
      .getOwnerName(userUuid)
      .then(function () {
        vm.ownerName = dataSetAboutFactory.ownerProfile.fullName;
      }, function (error) {
        $log.error(error);
      });
  };

  vm.refreshDataSetSharing();
}


angular
  .module('refineryDataSetAbout')
  .controller('AboutSharingCtrl',
  [
    'dataSetAboutFactory',
    '$scope',
    '$location',
    '$window',
    '$log',
    AboutSharingCtrl
  ]);

