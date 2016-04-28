'use strict';

function WorkflowListApiCtrl (
  $scope, $rootScope, $log, workflowService, workflow
) {
  $scope.workflowList = [];
  $scope.selectedWorkflow = { select: $scope.workflowList };
  $scope.getWorkflowList = function () {
    var Workflows = workflowService.get(function () {
      angular.copy(Workflows.objects, $scope.workflowList);
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
    '$log',
    'workflowService',
    'workflow',
    WorkflowListApiCtrl
  ]);
