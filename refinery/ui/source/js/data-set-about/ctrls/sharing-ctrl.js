'use strict';

function AboutSharingCtrl (
  dataSetAboutFactory,
  $scope,
  $location,
  $window,
  $log
  ) {
  var vm = this;
  vm.dataSetSharing = {};
  vm.ownerName = '';
  vm.groupList = [];

  vm.refreshDataSetSharing = function () {
    var dataSetUuid = $window.dataSetUuid;

    dataSetAboutFactory
      .getDataSetSharing(dataSetUuid)
      .then(function () {
        vm.dataSetSharing = dataSetAboutFactory.dataSetSharing;
        vm.refreshOwnerName(vm.dataSetSharing.owner);
        if (vm.dataSetSharing.share_list) {
          for (var i = 0; i < vm.dataSetSharing.share_list.length; i++) {
            vm.refreshGroup(vm.dataSetSharing.share_list[i]);
          }
        }
      }, function (error) {
        $log.error(error);
      });
  };

  vm.refreshGroup = function (shareObj) {
    dataSetAboutFactory
      .getGroup(shareObj)
      .then(function () {
        vm.groupList.push(dataSetAboutFactory.group);
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
    '$q',
    '$log',
    AboutSharingCtrl
  ]);

