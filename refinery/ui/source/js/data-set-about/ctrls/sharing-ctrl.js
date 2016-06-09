'use strict';

function AboutSharingCtrl (
  dataSetAboutFactory,
  $scope,
  $location,
  $window,
  $q
  ) {
  var vm = this;
  vm.dataSetSharing = {};
  vm.ownerName = '';
  vm.groupList = [];

  vm.refreshDataSetSharing = function () {
    var dataSetUuid = $window.dataSetUuid;

    var promise = $q.defer();
    dataSetAboutFactory.getDataSetSharing(dataSetUuid).then(function () {
      vm.dataSetSharing = dataSetAboutFactory.getDataSetSharing;
      vm.refreshOwnerName(vm.dataSetSharing.owner);
      for (var i = 0; i < vm.dataSetSharing.share_list.length; i++) {
        vm.refreshGroup(vm.dataSetSharing.share_list[i]);
      }
      promise.resolve();
    });
    return promise.promise;
  };

  vm.refreshGroup = function (shareObj) {
    var promise = $q.defer();
    dataSetAboutFactory.getGroup(shareObj).then(function () {
      vm.groupList.push(dataSetAboutFactory.group);
      promise.resolve();
    });
    return promise.promise;
  };

  vm.refreshOwnerName = function (userUuid) {
    var promise = $q.defer();
    dataSetAboutFactory.getOwnerName(userUuid).then(function () {
      vm.ownerName = dataSetAboutFactory.ownerProfile.fullName;
      promise.resolve();
    });
    return promise.promise;
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
    AboutSharingCtrl
  ]);

