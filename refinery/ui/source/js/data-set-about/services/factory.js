'use strict';

function dataSetAboutFactory (
  sharingService,
  userService,
  groupMemberService
) {
  var dataSet = {};
  var ownerProfile = {};
  var group = {};

  var getDataSharingSet = function (dataSetUuid) {
    var params = {
      uuid: dataSetUuid,
      model: 'data_sets'
    };
    var dataSetRequest = sharingService.query(params);
    dataSetRequest.$promise.then(function (response) {
      angular.copy(response, dataSet);
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
    ownerProfile: ownerProfile,
    group: group,
    getDataSharingSet: getDataSharingSet,
    getOwnerName: getOwnerName,
    getGroup: getGroup
  };
}

angular
  .module('refineryDataSetAbout')
  .factory('dataSetAboutFactory', [
    'sharingService',
    'userService',
    'groupMemberService',
    dataSetAboutFactory
  ]
);
