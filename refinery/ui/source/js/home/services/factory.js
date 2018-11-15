
/**
 * Chart Data Service
 * @namespace Chart Data Service
 * @desc Service which utilizes the user/files api to populate the home page
 * chart with accessible data sets
 * @memberOf refineryApp.refineryHome
 */
(function () {
  'use strict';
  angular
    .module('refineryHome')
    .factory('chartDataService', chartDataService);

  chartDataService.$inject = ['$log', 'userFileService'];

  function chartDataService ($log, userFileService) {
    var dataSets = [];

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
     * @name addToolLaunchStatus
     * @desc Adds tool launch to the list
     * @memberOf refineryToolLaunch.toolLaunchStatusService
     * @param {object} toolLaunch - custom tool launch object requires uuid,
     * tool type, name, and status
    **/
    function getDataSets () {
      var userFile = userFileService.query();
      userFile.$promise.then(function (response) {
        console.log(response);
      }, function (error) {
        $log.error(error);
      });
      return userFile.$promise;
    }
  }
})();
