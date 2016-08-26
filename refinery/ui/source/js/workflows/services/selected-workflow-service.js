'use strict';

function selectedWorkflowService (_) {
  var vm = this;
  vm.selectedWorkflowList = [];
  vm.selectedWorkflow = vm.selectedWorkflowList[0];

  /* Helper method to reset the selected Workflow to placeholder
  Used by ui-select dropdown in analyze tab */
  var resetSelectedWorkflow = function () {
    if (vm.selectedWorkflow === {}) {
      vm.selectedWorkflow = vm.selectedWorkflowList[0];
    }
  };

  /**
   * Deep copy of workflow list
   * @param { array } workflowList - list of workflow objects
   * */
  vm.setSelectedWorkflowList = function (workflowList) {
    angular.copy(workflowList, vm.selectedWorkflowList);
    resetSelectedWorkflow();
  };

  /**
   * When ui-select updates workflow, this method updates the service
   * selectedWorkflow. Keeps the selectedWorkflow persistant.
   * @param { object } workflow - obj from API
   */
  vm.setSelectedWorkflow = function (workflow) {
    // not empty
    if (!_.isEmpty(workflow)) {
      vm.selectedWorkflow = workflow;
    }
  };
}

angular.module('refineryWorkflows')
  .service('selectedWorkflowService', [
    '_',
    selectedWorkflowService
  ]
);
