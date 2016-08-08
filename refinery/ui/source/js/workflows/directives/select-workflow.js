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
      console.log('in the directive');
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
