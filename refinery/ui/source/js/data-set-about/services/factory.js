'use strict';

function dataSetAboutFactory (
  assayService,
  dataSetService,
  fileStoreItemService,
  groupMemberService,
  sharingService,
  studyService
) {
  var assays = [];
  var dataSet = {};
  var dataSetSharing = {};
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

  var getDataSetSharing = function (dataSetUuid) {
    var params = {
      uuid: dataSetUuid,
      model: 'data_sets'
    };
    var dataSetRequest = sharingService.query(params);
    dataSetRequest.$promise.then(function (response) {
      angular.copy(response, dataSetSharing);
    });
    return dataSetRequest.$promise;
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
    dataSetSharing: dataSetSharing,
    fileStoreItem: fileStoreItem,
    investigation: investigation,
    isaTab: isaTab,
    studies: studies,
    getDataSet: getDataSet,
    getDataSetSharing: getDataSetSharing,
    getFileStoreItem: getFileStoreItem,
    getStudies: getStudies,
    getStudysAssays: getStudysAssays
  };
}

angular
  .module('refineryDataSetAbout')
  .factory('dataSetAboutFactory', [
    'assayService',
    'dataSetService',
    'fileStoreItemService',
    'groupMemberService',
    'sharingService',
    'studyService',
    dataSetAboutFactory
  ]
);
