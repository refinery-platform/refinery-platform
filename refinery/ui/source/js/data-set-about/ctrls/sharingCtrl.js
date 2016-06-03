'use strict';

function AboutSharingCtrl (
  dataSetAboutFactory,
  $scope,
  $location,
  $window,
  $q
  ) {
  var vm = this;
  vm.dataSet = {};
  vm.ownerName = '';
  vm.groupList = [];

  vm.refreshDataSetStats = function () {
    var dataSetUuid = $window.dataSetUuid;

    var promise = $q.defer();
    dataSetAboutFactory.getDataSharingSet(dataSetUuid).then(function () {
      vm.dataSet = dataSetAboutFactory.dataSet;
      console.log(vm.dataSet);
      vm.refreshOwnerName(vm.dataSet.owner);
      for (var i = 0; i < vm.dataSet.share_list.length; i++) {
        vm.refreshGroup(vm.dataSet.share_list[i]);
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

  vm.refreshDataSetStats();
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

