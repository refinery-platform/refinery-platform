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
  vm.assays = {};
  vm.investigation = {};
  vm.dataSetUuid = $window.dataSetUuid;

  vm.refreshDataSetStats = function () {
    var promise = $q.defer();
    dataSetAboutFactory.getDataSet(vm.dataSetUuid).then(function () {
      vm.dataSet = dataSetAboutFactory.dataSet;
      promise.resolve();
    });
    return promise.promise;
  };

  vm.refreshInvestigation = function () {
    var promise = $q.defer();
    dataSetAboutFactory.getDataSetInvestigation(vm.dataSetUuid).then(function () {
      vm.dataSet = dataSetAboutFactory.investigation;
      promise.resolve();
    });
    return promise.promise;
  };

  vm.refreshStudies = function () {
    var promise = $q.defer();
    dataSetAboutFactory.getStudies(vm.dataSetUuid).then(function () {
      vm.studies = dataSetAboutFactory.studies;
      for (var i = 0; i < vm.studies.length; i++) {
        vm.refreshAssays(vm.studies[i].uuid);
      }
      promise.resolve();
    });
    return promise.promise;
  };

  vm.refreshAssays = function (studyUuid) {
    var promise = $q.defer();
    dataSetAboutFactory.getStudysAssays(studyUuid).then(function () {
      vm.assays[studyUuid] = dataSetAboutFactory.assays;
      promise.resolve();
    });
    return promise.promise;
  };

  vm.refreshDataSetStats();
  vm.refreshStudies();
  vm.refreshInvestigation();
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

