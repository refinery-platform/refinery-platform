/**
 * Data Set Visualization Ctrl
 * @namespace Data Set Visualization Ctrl
 * @desc Main controller for the visualization tab view.
 * @memberOf refineryApp.refineryDataSetVisualization
 */
(function () {
  'use strict';

  angular
    .module('refineryDataSetVisualization')
    .controller('DataSetVisualizationCtrl', DataSetVisualizationCtrl);

  DataSetVisualizationCtrl.$inject = ['$window', 'visualizationService'];

  function DataSetVisualizationCtrl (
    $window,
    visualizationService
  ) {
    var visService = visualizationService;
    var vm = this;
    vm.visLoadingFlag = 'LOADING';
    vm.visualizations = visService.visualizations;

    refreshVisualizations();

    function refreshVisualizations () {
      visService.getVisualizations($window.dataSetUuid).then(function () {
        vm.visualizations = visService.visualizations;
        vm.visLoadingFlag = 'DONE';
      });
    }
  }
})();
