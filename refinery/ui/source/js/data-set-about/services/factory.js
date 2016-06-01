'use strict';

function dataSetAboutFactory (
  dataSetService
) {
  var dataSet = {};

  var getDataSet = function (dataSetUuid) {
    var params = {
      uuid: dataSetUuid
    };

    var dataSetRequest = dataSetService.query(params);
    dataSetRequest.$promise.then(function (response) {
      console.log(response);
    });
    return dataSet.$promise;
  };

  return {
    dataSet: dataSet,
    getDataSet: getDataSet
  };
}

angular
  .module('refineryDataSetAbout')
  .factory('dataSetAboutFactory', [
    'dataSetService',
    dataSetAboutFactory
  ]
);
