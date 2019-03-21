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
    '$http',
    '$log',
    '$window',
    'settings',
    'dataSetPropsService',
    'visualizationService'
  ];

  function DataSetVisualizationCtrl (
    $http,
    $log,
    $window,
    settings,
    dataSetPropsService,
    visualizationService
  ) {
    var visService = visualizationService;
    var vm = this;
    vm.isOwner = isOwner;
    vm.relaunchTool = relaunchTool;
    vm.deleteTool = deleteTool;
    vm.userPerms = dataSetPropsService.userPerms;
    vm.visRelaunchList = {};
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
     * @name relaunchTool
     * @desc  Relaunches a tool
     * @memberOf refineryDataSetVisualization.DataSetVisualizationCtrl
     * @param {obj} vis - object with url to relaunch tool
    **/
    function relaunchTool (vis) {
      vm.visRelaunchList[vis.uuid] = true;
      $http.get(vis.relaunch_url)
        .then(function (response) {
          refreshVisualizations();
          vm.visRelaunchList[response.uuid] = false;
        }, function (error) {
          $log.error(error);
          vm.visRelaunchList[vis.uuid] = false;
        });
    }

    /**
     * @name deleteTool
     * @desc  Deletes a launced tool
     * @memberOf refineryDataSetVisualization.DataSetVisualizationCtrl
     * @param {obj} vis - object with url to delete tool
    **/
    function deleteTool (vis) {
      $http.delete(vis.detail_url)
        .then(function () {
          refreshVisualizations();
        }, function (error) {
          $log.error(error);
        });
    }

    /**
     * @name isOwner
     * @desc  Checks ownership based on profile uuid
     * @memberOf refineryDataSetVisualization.DataSetVisualizationCtrl
     * @param {str} visOwnerUuid - owner's profile uuid
    **/
    function isOwner (visOwnerUuid) {
      return visOwnerUuid === settings.djangoApp.userprofileUUID;
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
      }, function () {
        vm.visLoadingFlag = 'ERROR';
      });
    }
  }
})();
