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

  visualizationsService.$inject = ['toolsService'];

  function visualizationsService (
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
     * @name refreshToolParams
     * @desc Used by toolSelectService, updates the selected tool's
     * parameters used by the UI parameters panel
     * @memberOf refineryToolLaunch.toolParamsService
     * @param {object} tool - select tool object, includes property parameters
    **/
    function getVisualizations (params) {
      var toolRequest = toolsService.query(params);
      toolRequest.$promise.then(function (response) {
        angular.copy(response, visualizations);
      });
      return toolRequest.$promise;
    }
  }
})();
