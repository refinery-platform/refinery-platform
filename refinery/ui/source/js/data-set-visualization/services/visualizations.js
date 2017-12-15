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
    .factory('visualizationsService', visualizationsService);

  visualizationsService.$inject = ['_', 'humanize', 'toolsService'];

  function visualizationsService (
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
    function getVisualizations (params) {
      var toolRequest = toolsService.query(params);
      toolRequest.$promise.then(function (response) {
        angular.copy(addElapseAndHumanTime(response), visualizations);
      });
      return toolRequest.$promise;
    }

    // process responses from api
    function addElapseAndHumanTime (toolList) {
      for (var j = 0; j < toolList.length; j++) {
        console.log(toolList[j]);
        if (_.has(toolList[j], 'creation_date')) {
          toolList[j].humanizeStartTime = humanizeTimeObj(toolList[j].creation_date);
        }
      }
      return toolList;
    }

    function humanizeTimeObj (param) {
      console.log(param);
      var a = param.split(/[^0-9]/);
      var testDate = Date.UTC(a[0], a[1] - 1, a[2], a[3], a[4], a[5]);
      var curDate = new Date().getTimezoneOffset() * 60 * 1000;
      var offsetDate = testDate + curDate;
      var unixtime = offsetDate / 1000;

      return humanize.relativeTime(unixtime);
    }
  }
})();
