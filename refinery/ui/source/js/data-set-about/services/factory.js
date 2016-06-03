'use strict';

function dataSetAboutFactory (
  dataSetService,
  sharingService,
  userService,
  groupMemberService
) {
  var dataSet = {};
  var dataSetSharing = {};
  var ownerProfile = {};
  var group = {};

  var getDataSet = function (dataSetUuid) {
    var params = {
      uuid: dataSetUuid,
    };
    var dataSetRequest = dataSetService.query(params);
    dataSetRequest.$promise.then(function (response) {
      angular.copy(response, dataSet);
    });
    return dataSetRequest.$promise;
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
    getDataSet: getDataSet,
    getDataSharingSet: getDataSharingSet,
    getOwnerName: getOwnerName,
    getGroup: getGroup
  };
}

angular
  .module('refineryDataSetAbout')
  .factory('dataSetAboutFactory', [
    'dataSetService',
    'sharingService',
    'userService',
    'groupMemberService',
    dataSetAboutFactory
  ]
);
