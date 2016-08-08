'use strict';

function rpSelectWorkflow () {
  return {
    restrict: 'AE',
    templateUrl: '/static/partials/workflows/partials/select-workflow.html',
    controller: 'WorkflowListApiCtrl',
    controllerAs: 'WLACtrl',
    bindToController: {
      workflowList: '@',
      selectedWorkflow: '=?'
    },
    link: function (scope, element, attrs, ctrl) {
      ctrl.getWorkflowList();
    }
  };
}

angular
  .module('refineryWorkflows')
  .directive('rpSelectWorkflow', [
    rpSelectWorkflow
  ]
);
