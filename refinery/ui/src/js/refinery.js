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
      templateUrl: '/static/partials/workflows.html',
      controller: 'WorkflowListApiCtrl'
    });
}]);
