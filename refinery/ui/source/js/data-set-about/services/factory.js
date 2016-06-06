'use strict';

function dataSetAboutFactory (
  dataSetService,
  studyService,
  assayService,
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

  var getDataSet = function (dataSetUuid) {
    var params = {
      uuid: dataSetUuid,
    };
    var dataSetRequest = dataSetService.query(params);
    dataSetRequest.$promise.then(function (response) {
      console.log('in data set');
      console.log(response);
      angular.copy(response.objects[0], dataSet);
    });
    return dataSetRequest.$promise;
  };

  var getStudies = function (dataSetUuid) {
    var params = {
      uuid: dataSetUuid,
    };
    var study = studyService.query(params);
    study.$promise.then(function (response) {
      console.log('in study');
      console.log(response);
      angular.copy(response.objects, studies);
    });
    return study.$promise;
  };

  var getAssays = function (dataSetUuid) {
    var params = {
      uuid: dataSetUuid,
    };
    var assay = assayService.query(params);
    assay.$promise.then(function (response) {
      console.log('in assay');
      console.log(response);
      angular.copy(response.objects, assays);
    });
    return assay.$promise;
  };

  var getDataSharingSet = function (dataSetUuid) {
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
    dataSetSharing: dataSetSharing,
    ownerProfile: ownerProfile,
    group: group,
    studies: studies,
    assays: assays,
    getDataSet: getDataSet,
    getStudies: getStudies,
    getAssays: getAssays,
    getDataSharingSet: getDataSharingSet,
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
    'sharingService',
    'userService',
    'groupMemberService',
    dataSetAboutFactory
  ]
);
