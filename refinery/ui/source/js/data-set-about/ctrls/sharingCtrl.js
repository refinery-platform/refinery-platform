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
  vm.groupName = '';

  vm.refreshDataSetStats = function () {
    var dataSetUuid = $window.dataSetUuid;

    var promise = $q.defer();
    dataSetAboutFactory.getDataSharingSet(dataSetUuid).then(function () {
      vm.dataSet = dataSetAboutFactory.dataSet;
      vm.refreshOwnerName(vm.dataSet.owner);
      vm.refreshGroup(dataSetUuid);
      promise.resolve();
    });
    return promise.promise;
  };

  vm.refreshGroup = function (uuid) {
    var promise = $q.defer();
    dataSetAboutFactory.getGroup(uuid).then(function () {
      console.log('in resolve');
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

