'use strict';

function AboutDetailsCtrl (
  $location,
  $log,
  $scope,
  $window,
  dataSetAboutFactory,
  dataSetPermsService,
  dataSetTakeOwnershipService,
  fileRelationshipService
  ) {
  var vm = this;
  vm.loggedIn = typeof $window.djangoApp !== 'undefined' &&
      typeof $window.djangoApp.userName !== 'undefined';
  vm.assays = dataSetAboutFactory.assays;
  vm.dataSet = dataSetAboutFactory.dataSet;
  vm.dataSetImportStatus = 'NONE';
  vm.dataSetUuid = $window.dataSetUuid;
  vm.editedDataSet = {};
  vm.fileStoreItem = dataSetAboutFactory.fileStoreItem;
  vm.isCollapsed = {
    title: true,
    summary: true,
    description: true,
    slug: true
  };
  vm.studies = dataSetAboutFactory.studies;
  vm.userPerms = dataSetPermsService.userPerms;

  vm.cancel = function (fieldName) {
    vm.editedDataSet[fieldName] = '';
    vm.isCollapsed[fieldName] = true;
  };

  vm.importDataSet = function (dataSetUuid) {
    vm.dataSetImportStatus = 'RUNNING';
    dataSetTakeOwnershipService.save({
      data_set_uuid: dataSetUuid
    }).$promise.then(function () {
      vm.dataSetImportStatus = 'SUCCESS';
    }, function (error) {
      $log.error(error);
      vm.dataSetImportStatus = 'FAIL';
    });
  };

  vm.refreshDataSetStats = function () {
    dataSetAboutFactory
      .getDataSet(vm.dataSetUuid)
      .then(function () {
        vm.dataSet = dataSetAboutFactory.dataSet;
        // initialize the edited dataset, avoids updating while user edits
        angular.copy(vm.dataSet, vm.editedDataSet);
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
      if (fieldName === 'accession') {
        vm.isCollapsed.title = true;
      } else {
        vm.isCollapsed[fieldName] = true;
      }
    }, function (error) {
      $log.error(error);
    });
  };

  $scope.$watchCollection(
    function () {
      return dataSetPermsService.userPerms;
    },
    function () {
      vm.userPerms = dataSetPermsService.userPerms;
    }
  );

  vm.refreshDataSetStats();
  vm.refreshStudies();
    // Close ui-grid popover when tabbing
  fileRelationshipService.hideNodePopover = true;
}

angular
  .module('refineryDataSetAbout')
  .controller('AboutDetailsCtrl',
  [
    '$location',
    '$log',
    '$scope',
    '$window',
    'dataSetAboutFactory',
    'dataSetPermsService',
    'dataSetTakeOwnershipService',
    'fileRelationshipService',
    AboutDetailsCtrl
  ]);
