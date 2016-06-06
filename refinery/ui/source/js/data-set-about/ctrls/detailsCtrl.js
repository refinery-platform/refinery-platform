'use strict';

function AboutDetailsCtrl (
  dataSetAboutFactory,
  $scope,
  $location,
  $window,
  $q
  ) {
  var vm = this;
  vm.dataSet = {};
  vm.studies = [];
  vm.assays = [];
  vm.dataSetUuid = $window.dataSetUuid;

  vm.refreshDataSetStats = function () {
    var promise = $q.defer();
    dataSetAboutFactory.getDataSet(vm.dataSetUuid).then(function () {
      vm.dataSet = dataSetAboutFactory.dataSet;
      promise.resolve();
    });
    return promise.promise;
  };

  vm.refreshStudies = function () {
    var promise = $q.defer();
    dataSetAboutFactory.getStudies(vm.dataSetUuid).then(function () {
      vm.studies = dataSetAboutFactory.studies;
      promise.resolve();
    });
    return promise.promise;
  };

  vm.refreshAssays = function () {
    var promise = $q.defer();
    dataSetAboutFactory.getAssays(vm.dataSetUuid).then(function () {
      vm.assays = dataSetAboutFactory.assays;
      promise.resolve();
    });
    return promise.promise;
  };

  vm.refreshDataSetStats();
  vm.refreshStudies();
  vm.refreshAssays();
}

angular
  .module('refineryDataSetAbout')
  .controller('AboutDetailsCtrl',
  [
    'dataSetAboutFactory',
    '$scope',
    '$location',
    '$window',
    '$q',
    AboutDetailsCtrl
  ]);

