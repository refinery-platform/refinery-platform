'use strict';

function dataSetAboutFactory (
  dataSetService,
  userService
) {
  var dataSet = {};
  var ownerProfile = {};

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
    getDataSet: getDataSet,
    getOwnerName: getOwnerName
  };
}

angular
  .module('refineryDataSetAbout')
  .factory('dataSetAboutFactory', [
    'dataSetService',
    'userService',
    dataSetAboutFactory
  ]
);
