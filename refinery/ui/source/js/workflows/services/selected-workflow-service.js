'use strict';

function selectedWorkflowService () {
  var vm = this;
  vm.selectedWorkflowList = [];
  vm.selectedWorkflow = vm.selectedWorkflowList[0];

  var resetSelectedWorkflow = function () {
    if (vm.selectedWorkflow === {}) {
      vm.selectedWorkflow = vm.selectedWorkflowList[0];
    }
  };

  vm.setSelectedWorkflowList = function (workflowList) {
    angular.copy(workflowList, vm.selectedWorkflowList);
    resetSelectedWorkflow();
  };

  vm.setSelectedWorkflow = function (workflow) {
    if (workflow !== {}) {
      vm.selectedWorkflow = workflow;
    }
  };
}

angular.module('refineryWorkflows')
  .service('selectedWorkflowService', [
    selectedWorkflowService
  ]
);
