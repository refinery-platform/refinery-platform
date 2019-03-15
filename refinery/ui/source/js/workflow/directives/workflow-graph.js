/**
 * Workflow Component
 * @namespace rpWorkflowDisplay
 * @desc Main parent component for the main view, workflow view.
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
