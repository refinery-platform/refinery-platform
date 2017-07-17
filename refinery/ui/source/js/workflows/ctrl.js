'use strict';

function WorkflowListApiCtrl (
  $scope,
  $rootScope,
  workflowService,
  workflow,
  $location,
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
    'selectedWorkflowService',
    WorkflowListApiCtrl
  ]);
