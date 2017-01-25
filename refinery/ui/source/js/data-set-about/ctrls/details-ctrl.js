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
  vm.isCollapsed = {
    name: true,
    summary: true,
    description: true,
    slug: true
  };
  vm.updatedField = {};

  vm.refreshDataSetStats = function () {
    dataSetAboutFactory
      .getDataSet(vm.dataSetUuid)
      .then(function () {
        vm.dataSet = dataSetAboutFactory.dataSet;
        vm.checkUserPermissions();
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

  vm.updateDataSet = function (fieldName, formInput) {
    var params = { uuid: vm.dataSetUuid };
    params[fieldName] = formInput;
    dataSetAboutFactory.updateDataSet(params).then(function () {
      vm.dataSet[fieldName] = formInput;
      vm.isCollapsed[fieldName] = true;
    }, function (error) {
      console.log(error);
    });
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

