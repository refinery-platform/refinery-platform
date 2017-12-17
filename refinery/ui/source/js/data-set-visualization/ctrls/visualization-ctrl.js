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
    vm.visualizations = visService.visualizations;
    activate();
    /*
     * -----------------------------------------------------------------------------
     * Methods
     * -----------------------------------------------------------------------------
     */
    function activate () {
      if (!visService.visualizations.length && vm.visLoadingFlag !== 'EMPTY') {
        vm.visLoadingFlag = 'LOADING';
        refreshVisualizations();
      }
    }

     /**
     * @name refreshVisualizations
     * @desc  Updates the visualization list
     * @memberOf refineryDataSetVisualization.DataSetVisualizationCtrl
    **/
    function refreshVisualizations () {
      visService.getVisualizations($window.dataSetUuid).then(function () {
        vm.visualizations = visService.visualizations;
        if (!vm.visualizations.length) {
          vm.visLoadingFlag = 'EMPTY';
        } else {
          vm.visLoadingFlag = 'DONE';
        }
      });
    }
  }
})();
