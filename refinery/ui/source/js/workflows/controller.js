'use strict';

function WorkflowListApiCtrl (
  $scope, $rootScope, workflowService, workflow
) {
  $scope.workflowList = [];
  $scope.selectedWorkflow = { select: $scope.workflowList[0] };

  $scope.getWorkflowList = function () {
    var Workflows = workflowService.get(function () {
      $scope.workflowList = Workflows.objects;
    });
  };

  $scope.getWorkflowList();

  $scope.currentWorkflow = workflow;

  $scope.updateCurrentWorkflow = function () {
    workflow.set($scope.selectedWorkflow.select);

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
    'workflowService',
    'workflow',
    WorkflowListApiCtrl
  ]);
