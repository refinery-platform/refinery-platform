'use strict';

function dataSetAboutFactory (
  assayService,
  dataSetService,
  dataSetV2Service,
  fileStoreItemService,
  groupMemberService,
  studyService
) {
  var assays = [];
  var dataSet = {};
  var fileStoreItem = {};
  var investigation = {};
  var isaTab = {};
  var studies = [];

  var getDataSet = function (dataSetUuid) {
    var params = {
      uuid: dataSetUuid
    };
    var dataSetRequest = dataSetService.query(params);
    dataSetRequest.$promise.then(function (response) {
      angular.copy(response.objects[0], dataSet);
    });
    return dataSetRequest.$promise;
  };

  var updateDataSet = function (params) {
    var dataSetRequest = dataSetV2Service.partial_update(params);
    return dataSetRequest.$promise;
  };

  // For isa-archive and pre-isa-archive file download url
  var getFileStoreItem = function (isaUuid) {
    var params = {
      uuid: isaUuid
    };
    var fileStore = fileStoreItemService.query(params);
    fileStore.$promise.then(function (response) {
      angular.copy(response, fileStoreItem);
    });
    return fileStore.$promise;
  };

  // Get Studies associated with a data set
  var getStudies = function (dataSetUuid) {
    var params = {
      uuid: dataSetUuid
    };
    var study = studyService.query(params);
    study.$promise.then(function (response) {
      angular.copy(response.objects, studies);
    });
    return study.$promise;
  };

  // Get assays associated with a study
  var getStudysAssays = function (studyUuid) {
    var params = {
      study: studyUuid
    };
    var assay = assayService.query(params);
    assay.$promise.then(function (response) {
      angular.copy(response, assays);
    });
    return assay.$promise;
  };

  return {
    assays: assays,
    dataSet: dataSet,
    fileStoreItem: fileStoreItem,
    investigation: investigation,
    isaTab: isaTab,
    studies: studies,
    getDataSet: getDataSet,
    getFileStoreItem: getFileStoreItem,
    getStudies: getStudies,
    getStudysAssays: getStudysAssays,
    updateDataSet: updateDataSet
  };
}

angular
  .module('refineryDataSetAbout')
  .factory('dataSetAboutFactory', [
    'assayService',
    'dataSetService',
    'dataSetV2Service',
    'fileStoreItemService',
    'groupMemberService',
    'studyService',
    dataSetAboutFactory
  ]
);
