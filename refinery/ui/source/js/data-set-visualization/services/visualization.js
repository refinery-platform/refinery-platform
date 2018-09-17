/**
 * Visualizations Service
 * @namespace visualizationsService
 * @desc Service which maintains the visualization list
 * @memberOf refineryApp.refineryDataSetVisualization
 */
(function () {
  'use strict';
  angular
    .module('refineryDataSetVisualization')
    .factory('visualizationService', visualizationService);

  visualizationService.$inject = ['_', 'humanize', 'toolsService'];

  function visualizationService (
    _,
    humanize,
    toolsService
  ) {
    /**
     * List of all the visualization tools launched
    */
    var visualizations = [];

    var service = {
      getVisualizations: getVisualizations,
      visualizations: visualizations
    };
    var params = {
      tool_type: 'visualization'
    };

    return service;
    /*
     *-----------------------
     * Method Definitions
     * ----------------------
     */
    /**
     * @name getVisualizations
     * @desc Get the visualization using the visualization service and tools
     * api
     * @memberOf refineryToolLaunch.toolParamsService
     * @param {object} tool - select tool object, includes property parameters
    **/
    function getVisualizations (dataSetUuid) {
      params.data_set_uuid = dataSetUuid;
      var toolRequest = toolsService.query(params);
      toolRequest.$promise.then(function (response) {
        angular.copy(addHumanTime(response), visualizations);
      });
      return toolRequest.$promise;
    }

    // private method to convert utc to local time unix
    function utcToLocalUnix (utcTime) {
      return (new Date(utcTime)) / 1000;
    }

    // process responses from api
    function addHumanTime (toolList) {
      for (var j = 0; j < toolList.length; j++) {
        if (_.has(toolList[j], 'creation_date')) {
          var localTime = utcToLocalUnix(toolList[j].creation_date);
          toolList[j].humanizeCreateTime = humanize.relativeTime(localTime);
        }
      }
      return toolList;
    }
  }
})();
