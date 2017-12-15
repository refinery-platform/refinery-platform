/**
 * Tool Display Component
 * @namespace rpToolDisplay
 * @desc Main parent component for the main view, tool display. View consist
 * of the entire tool launch panel.
 * @memberOf refineryApp.refineryToolLaunch
 */
(function () {
  'use strict';
  angular
    .module('refineryDataSetVisualization')
    .component('rpDataSetVisualizations', {
      controller: 'DataSetVisualizationCtrl',
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl('partials/data-set-visualization/partials/visualizations.html');
      }]
    });
})();
