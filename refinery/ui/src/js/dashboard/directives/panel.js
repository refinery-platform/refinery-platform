angular
  .module('refineryDashboard')
  .directive('refineryDashboardPanel', [
    '$compile', '$templateCache', '$timeout',
    function ($compile, $templateCache, $timeout) {
      var directive = {
        link: link,
        replace: true,
        restrict: 'E',
        scope: {
          headerIcon: '@',
          spanSize: '@',
          title: '@'
        },
        templateUrl: '/static/partials/dashboard/directives/panel.html'
      };

      function link (scope, element, attrs) {
        scope.sharingEnabled = function () {
          return true;
        };
      }

      return directive;
    }
  ]);
