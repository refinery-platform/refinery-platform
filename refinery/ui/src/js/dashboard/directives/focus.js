angular
  .module('refineryDashboard')
  .directive('refineryDashboardFocus', [
    'dataSetSearchInputService',
    function (dataSetSearchInputService) {
      var directive = {
        link: link,
        restrict: 'AE'
      };

      function link (scope, element, attrs) {
        scope.$watch(function () {
          return dataSetSearchInputService.focus;
        }, function (focus) {
          console.log('refineryDashboardFocus', focus);
          if (dataSetSearchInputService.focus) {
            element[0].focus();
          }
        });
      }

      return directive;
    }
  ]);
