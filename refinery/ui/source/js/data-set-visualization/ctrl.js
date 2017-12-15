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

  DataSetVisualizationCtrl.$inject = ['$window', 'visualizationsService'];

  function DataSetVisualizationCtrl (
    $window,
    visualizationsService
  ) {
    var visService = visualizationsService;
    var vm = this;
    vm.visualizations = visService.visualizations;
    console.log('i am the main ctrl');
    var params = {
      data_set_uuid: $window.dataSetUuid,
      tool_type: 'visualization'
    };
    refreshVisualizations();

    function refreshVisualizations () {
      visService.getVisualizations(params).then(function () {
        console.log('in the ctrl promise');
        vm.visualizations = visService.visualizations;
        console.log(vm.visualizations);
      });
    }
  }
})();
