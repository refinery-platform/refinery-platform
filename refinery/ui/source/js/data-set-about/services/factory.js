'use strict';

function dataSetAboutFactory (
  sharingService,
  userService,
  groupService
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

  var getGroup = function (groupUuid) {
    var params = {
      uuid: groupUuid
    };
    var groupRequest = groupService.query(params);
    console.log('in getGroupFactory');
    console.log(groupRequest);
    groupRequest.$promise.then(function (response) {
      console.log(response);
      angular.copy(response.objects[0], group);
     // angular.copy(response.objects[0], group);
    });
    return group.$promise;
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
    'groupService',
    dataSetAboutFactory
  ]
);
