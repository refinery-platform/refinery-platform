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
  vm.workflowList = [];
  vm.selectedWorkflow = { select: selectedWorkflowService.selectedWorkflow };

  vm.getWorkflowList = function () {
    var Workflows = workflowService.get(function () {
      selectedWorkflowService.setSelectedWorkflowList(Workflows.objects);
      vm.workflowList = selectedWorkflowService.selectedWorkflowList;
    });
  };

  $scope.currentWorkflow = workflow;

  vm.updateCurrentWorkflow = function () {
    workflow.set(vm.selectedWorkflow.select);

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

  // Watches for a new workflow selection and updates service
  $scope.$watch(
    function () {
      return vm.selectedWorkflow.select;
    },
    function () {
      selectedWorkflowService.setSelectedWorkflow(vm.selectedWorkflow.select);
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
