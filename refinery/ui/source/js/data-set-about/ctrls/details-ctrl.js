'use strict';

function AboutDetailsCtrl (
  dataSetAboutFactory,
  $scope,
  $location,
  $window,
  $log
  ) {
  var vm = this;
  vm.dataSet = dataSetAboutFactory.dataSet;
  vm.studies = dataSetAboutFactory.studies;
  vm.assays = dataSetAboutFactory.assays;
  vm.dataSetUuid = $window.dataSetUuid;
  vm.fileStoreItem = dataSetAboutFactory.fileStoreItem;


  vm.refreshDataSetStats = function () {
    dataSetAboutFactory
      .getDataSet(vm.dataSetUuid)
      .then(function () {
        vm.dataSet = dataSetAboutFactory.dataSet;
        // grab meta-data info
        if (dataSetAboutFactory.dataSet.isa_archive) {
          vm.refreshFileStoreItem(dataSetAboutFactory.dataSet.isa_archive);
        } else if (dataSetAboutFactory.dataSet.pre_isatab_archive) {
          vm.refreshFileStoreItem(dataSetAboutFactory.dataSet.pre_isa_archive);
        }
      }, function (error) {
        $log.error(error);
      });
  };

  vm.refreshStudies = function () {
    dataSetAboutFactory
      .getStudies(vm.dataSetUuid)
      .then(function () {
        vm.studies = dataSetAboutFactory.studies;
        for (var i = 0; i < vm.studies.length; i++) {
          vm.refreshAssays(vm.studies[i].uuid);
        }
      }, function (error) {
        $log.error(error);
      });
  };

  vm.refreshAssays = function (studyUuid) {
    dataSetAboutFactory
      .getStudysAssays(studyUuid)
      .then(function () {
        vm.assays[studyUuid] = dataSetAboutFactory.assays;
      }, function (error) {
        $log.error(error);
      });
  };

  vm.refreshFileStoreItem = function (isaUuid) {
    dataSetAboutFactory
      .getFileStoreItem(isaUuid)
      .then(function () {
        vm.fileStoreItem = dataSetAboutFactory.fileStoreItem;
      }, function (error) {
        $log.error(error);
      });
  };

  vm.updateDataSet = function () {
    dataSetAboutFactory.updateDataSet(
      {
        uuid: vm.dataSetUuid,
        summary: 'Does this work'
      }
    );
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
    '$log',
    AboutDetailsCtrl
  ]);

