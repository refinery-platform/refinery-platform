'use strict';

function rpSelectWorkflow ($window) {
  return {
    restrict: 'AE',
    templateUrl: function () {
      return $window.getStaticUrl('partials/workflows/partials/select-workflow.html');
    },
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
    '$window',
    rpSelectWorkflow
  ]
);
