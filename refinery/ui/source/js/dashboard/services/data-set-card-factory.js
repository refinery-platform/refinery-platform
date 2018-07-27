/**
 * Data Set Card Factory
 * @namespace dataSetCardFactory
 * @desc Service pings api for data sets list and tracks the latests params
 * @memberOf refineryApp.refineryDashboard
 */
(function () {
  'use strict';
  angular
    .module('refineryDashboard')
    .factory('dataSetCardFactory', dataSetCardFactory);

  dataSetCardFactory.$inject = [
    '$log',
    '_',
    'dataSetV2Service'
  ];

  function dataSetCardFactory (
    $log,
    _,
    dataSetV2Service
  ) {
    var dataSets = [];
    var currentParams = {};

    var service = {
      dataSets: dataSets,
      getDataSets: getDataSets
    };
    return service;

    /*
    *-----------------------
    * Method Definitions
    * ----------------------
    */
    /**
     * @name getDataSets
     * @desc  Uses service to refresh data sets list and update latest params
     * @memberOf refineryDashboard.dataSetCardFactory
     * @param {obj} params: tracks filters for public, owner, & group
    **/
    function getDataSets (params) {
      // grabs the latest params
      angular.copy(params, currentParams);
      var dataSetsRequest = dataSetV2Service.query(params);
      dataSetsRequest.$promise.then(function (response) {
        // only update the state if it's the correct params (avoid raceconditions)
        if (_.isEqual(currentParams, response.config.params)) {
          angular.copy(response.data, dataSets);
        }
      });
      return dataSetsRequest.$promise;
    }
  }
})();
