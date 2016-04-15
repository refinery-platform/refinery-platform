'use strict';

function WorkflowListApiCtrl (
  $scope, $rootScope, $log, workflowService, workflow
) {
  $scope.getWorkflowList = function () {
    var Workflows = workflowService.get(function () {
      $scope.workflowList = Workflows.objects;
    });
  };

  $scope.getWorkflowList();

  $scope.currentWorkflow = workflow;

  $scope.updateCurrentWorkflow = function () {
    workflow.set($scope.workflowList[$scope.workflowIndex]);

    if (workflow.isAvailable()) {
      $rootScope.$emit('workflowChangedEvent', workflow.get());
    }
  };
}

angular
  .module('refineryWorkflows')
  .controller('WorkflowListApiCtrl', [
    '$scope',
    '$rootScope',
    '$log',
    'workflowService',
    'workflow',
    WorkflowListApiCtrl
  ]);
