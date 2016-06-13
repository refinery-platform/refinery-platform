'use strict';

function dataSetAboutFactory (
  dataSetService,
  studyService,
  assayService,
  fileStoreItemService,
  sharingService,
  userService,
  groupMemberService
) {
  var dataSet = {};
  var dataSetSharing = {};
  var ownerProfile = {};
  var group = {};
  var studies = [];
  var assays = [];
  var investigation = {};
  var isaTab = {};
  var preIsaTab = {};
  var fileStoreItem = {};

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

  // For isa-archive and pre-isa-archive file download url
  var getFileStoreItem = function (isaUuid) {
    var params = {
      uuid: isaUuid
    };
    console.log(isaUuid);
    var fileStore = fileStoreItemService.query(params);
    fileStore.$promise.then(function (response) {
      console.log('in file Store item');
      console.log(response);
      angular.copy(response, fileStoreItem);
    });
    return fileStore.$promise;
  };

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

  return {
    dataSet: dataSet,
    fileStoreItem: fileStoreItem,
    dataSetSharing: dataSetSharing,
    ownerProfile: ownerProfile,
    group: group,
    studies: studies,
    investigation: investigation,
    assays: assays,
    isaTab: isaTab,
    preIsaTab: preIsaTab,
    getDataSet: getDataSet,
    getFileStoreItem: getFileStoreItem,
    getStudies: getStudies,
    getStudysAssays: getStudysAssays,
    getDataSetSharing: getDataSetSharing,
    getOwnerName: getOwnerName,
    getGroup: getGroup
  };
}

angular
  .module('refineryDataSetAbout')
  .factory('dataSetAboutFactory', [
    'dataSetService',
    'studyService',
    'assayService',
    'fileStoreItemService',
    'sharingService',
    'userService',
    'groupMemberService',
    dataSetAboutFactory
  ]
);
