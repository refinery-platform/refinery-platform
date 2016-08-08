'use strict';

function WorkflowListApiCtrl (
  $scope,
  $rootScope,
  workflowService,
  workflow,
  $location,
  selectedNodesService,
  selectedWorkflowService
) {
  var vm = this;
  $scope.workflowList = [];
  $scope.selectedWorkflow = { select: selectedWorkflowService.selectedWorkflow };

  vm.getWorkflowList = function () {
    var Workflows = workflowService.get(function () {
      selectedWorkflowService.setSelectedWorkflowList(Workflows.objects);
      $scope.workflowList = selectedWorkflowService.selectedWorkflowList;
    });
  };

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

  $scope.$watch(
    function () {
      return $scope.selectedWorkflow.select;
    },
    function () {
      console.log('in the watcher');
      selectedWorkflowService.setSelectedWorkflow($scope.selectedWorkflow.select);
    }
  );
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
    'selectedWorkflowService',
    WorkflowListApiCtrl
  ]);
