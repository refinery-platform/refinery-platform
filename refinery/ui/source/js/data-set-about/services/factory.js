'use strict';

function dataSetAboutFactory (
  assayService,
  dataSetService,
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
  var group = {};
  var investigation = {};
  var isaTab = {};
  var ownerProfile = {};
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

  var generateGroupObj = function (dataObj, permissions) {
    return {
      name: dataObj.name,
      id: dataObj.id,
      uuid: dataObj.uuid,
      canEdit: permissions.change,
      canRead: permissions.read
    };
  };

  var getGroup = function (shareObj) {
    var params = {
      id: shareObj.groupId
    };
    var groupRequest = groupMemberService.query(params);
    groupRequest.$promise.then(function (response) {
      angular.copy(generateGroupObj(response.objects[0], shareObj.perms), group);
    });
    return groupRequest.$promise;
  };

  var getOwnerName = function (userUuid) {
    var ownerService = userService.get(userUuid);
    ownerService.then(function (response) {
      angular.copy(response, ownerProfile);
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
    group: group,
    investigation: investigation,
    isaTab: isaTab,
    ownerProfile: ownerProfile,
    studies: studies,
    getDataSet: getDataSet,
    getDataSetSharing: getDataSetSharing,
    getFileStoreItem: getFileStoreItem,
    getGroup: getGroup,
    getOwnerName: getOwnerName,
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
    'userService',
    dataSetAboutFactory
  ]
);
