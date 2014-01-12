angular.module('refineryApp', [
  'ui.select2',
  'ngResource',
  'ngRoute',
  'refineryControllers',
  'refineryServices',
])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.
    when('/analyze', {
      templateUrl: '/static/partials/data_set_ui_mode_analyze.html',
      controller: 'WorkflowListApiCtrl'
    });
}]);
