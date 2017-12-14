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

  DataSetVisualizationCtrl.$inject = [
    '$scope',
    '_',
    'toolSelectService'];

  function DataSetVisualizationCtrl (
  ) {
    console.log('i am the main ctrl');
    /*
    * ---------------------------------------------------------
    * Watchers
    * ---------------------------------------------------------
    */
  }
})();
