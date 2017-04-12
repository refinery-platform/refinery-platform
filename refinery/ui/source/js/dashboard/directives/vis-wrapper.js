'use strict';

function refineryDashboardVisWrapper ($window) {
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
    templateUrl: function () {
      return $window.getStaticUrl('partials/dashboard/directives/vis-wrapper.html');
    },
    link: function (scope) {
      scope.icons = $window.getStaticUrl('images/icons.svg');
    }
  };
}

angular
  .module('refineryDashboard')
  .directive('refineryDashboardVisWrapper', [
    '$window',
    refineryDashboardVisWrapper
  ]);
