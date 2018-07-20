/**
 * Data Set Factory
 * @namespace dataSetFactory
 * @desc Service tracks the selected tool, grabs the tool definition
 * list from service, and tracks if the panels are collapsed
 * @memberOf refineryApp.refineryDashboard
 */
(function () {
  'use strict';
  angular
    .module('refineryDashboard')
    .factory('dataSetCardFactory', dataSetCardFactory);

  dataSetCardFactory.$inject = [
    '$log',
    '$q',
    'settings',
    '_',
    'dataSetV2Service'
  ];

  function dataSetCardFactory (
    $log,
    settings,
    $q,
    _,
    dataSetV2Service) {
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
     * @name setPrimaryGroup
     * @desc  Sets the primary group though api service and updates primaryGroup
     * @memberOf refineryDashboard.primaryGroupService
     * @param {obj} group - contains group name and id
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
