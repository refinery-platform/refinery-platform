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

  vm.refreshDataSetStats = function () {
    var dataSetUuid = $window.dataSetUuid;

    var promise = $q.defer();
    dataSetAboutFactory.getDataSet(dataSetUuid).then(function () {
      vm.dataSet = dataSetAboutFactory.dataSet;
      vm.refreshOwnerName(vm.dataSet.owner);
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

