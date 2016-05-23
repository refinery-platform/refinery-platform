'use strict';

function refineryDashboardVisWrapper () {
  return {
    bindToController: {
      active: '='
    },
    controller: 'VisWrapperCtrl',
    controllerAs: 'visWrapper',
    restrict: 'E',
    replace: true,
    scope: {
      active: '='
    },
    templateUrl: '/static/partials/dashboard/directives/vis-wrapper.html'
  };
}

angular
  .module('refineryDashboard')
  .directive('refineryDashboardVisWrapper', [
    refineryDashboardVisWrapper
  ]);
