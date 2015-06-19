angular
  .module('refineryDashboard')
  .directive('refineryDashboardPanel', [
    function () {
      var directive = {
        link: link,
        restrict: 'AE'
      };

      function link (scope, element, attrs) {
        // scope.expandDataSetPanel();
      }

      return directive;
    }
  ]);
