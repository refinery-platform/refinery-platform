'use strict';

function WorkflowListApiCtrl (
  $scope,
  $rootScope,
  workflowService,
  workflow,
  $location,
  selectedNodesService
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

  // Temp method for setting which file browser is being uses
  $scope.whichFileBrowserBrowser = function () {
    $scope.dataSet2Flag = false;
    if ($location.absUrl().indexOf('data_sets2') > -1) {
      $scope.dataSet2Flag = true;
    }
  };

  $scope.isLaunchNodesSelectionEmpty = function () {
    return selectedNodesService.isNodeSelectionEmpty();
  };

  $scope.whichFileBrowserBrowser();
}

angular
  .module('refineryWorkflows')
  .controller('WorkflowListApiCtrl', [
    '$scope',
    '$rootScope',
    'workflowService',
    'workflow',
    '$location',
    'selectedNodesService',
    WorkflowListApiCtrl
  ]);
