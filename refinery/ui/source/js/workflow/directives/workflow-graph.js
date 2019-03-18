/**
 * Workflow Component
 * @namespace rpWorkflowDisplay
 * @desc Main component for the workflow - graph on the workflow view.
 * @memberOf refineryApp.refineryToolLaunch
 */
(function () {
  'use strict';
  angular
    .module('refineryWorkflow')
    .component('rpWorkflowGraph', {
      controller: 'WorkflowGraphCtrl',
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl('partials/workflow/partials/workflow-graph.html');
      }]
    });
})();
