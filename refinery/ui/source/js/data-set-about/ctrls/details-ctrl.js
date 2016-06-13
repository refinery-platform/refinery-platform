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
  vm.dataSetUuid = $window.dataSetUuid;
  vm.fileStoreItem = {};

  vm.refreshDataSetStats = function () {
    var promise = $q.defer();
    dataSetAboutFactory.getDataSet(vm.dataSetUuid).then(function () {
      vm.dataSet = dataSetAboutFactory.dataSet;
      // grab meta-data info
      if (dataSetAboutFactory.dataSet.isa_archive) {
        vm.refreshFileStoreItem(dataSetAboutFactory.dataSet.isa_archive);
      } else if (dataSetAboutFactory.dataSet.pre_isatab_archive) {
        vm.refreshFileStoreItem(dataSetAboutFactory.dataSet.pre_isa_archive);
      }
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

  vm.refreshFileStoreItem = function (isaUuid) {
    var promise = $q.defer();
    dataSetAboutFactory.getFileStoreItem(isaUuid).then(function () {
      vm.fileStoreItem = dataSetAboutFactory.fileStoreItem;
      promise.resolve();
    });
    return promise.promise;
  };

  vm.refreshDataSetStats();
  vm.refreshStudies();
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

