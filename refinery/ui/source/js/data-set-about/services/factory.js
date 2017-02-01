'use strict';

function dataSetAboutFactory (
  assayService,
  dataSetService,
  dataSetV2Service,
  fileStoreItemService,
  groupMemberService,
  sharingService,
  studyService,
  userService
) {
  var assays = [];
  var dataSet = {};
  var dataSetSharing = {};
  var fileStoreItem = {};
  var investigation = {};
  var isaTab = {};
  var ownerProfile = {};
  var ownerName = '';
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

  var getOwnerName = function (userUuid) {
    var ownerService = userService.get(userUuid);
    ownerService.then(function (response) {
      angular.copy(response, ownerProfile);
      ownerName = ownerProfile.fullName;
    });
    return ownerService;
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
    ownerName: ownerName,
    studies: studies,
    getDataSet: getDataSet,
    getDataSetSharing: getDataSetSharing,
    getFileStoreItem: getFileStoreItem,
    getOwnerName: getOwnerName,
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
    'sharingService',
    'studyService',
    'userService',
    dataSetAboutFactory
  ]
);
