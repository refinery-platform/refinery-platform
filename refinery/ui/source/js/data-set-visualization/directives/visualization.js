/**
 * Data Set Visualization
 * @namespace rpDataSetVisualization
 * @desc Main component for the visualization list.
 * @memberOf refineryApp.refineryDataSetVisualization
 */
(function () {
  'use strict';
  angular
    .module('refineryDataSetVisualization')
    .component('rpDataSetVisualization', {
      controller: 'DataSetVisualizationCtrl',
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl('partials/data-set-visualization/partials/visualization.html');
      }]
    });
})();
