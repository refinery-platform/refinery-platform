angular.module('refineryApp', [
  'ui.select2',
  'ngResource',
  'ngRoute',
  'refineryWorkflows',
])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.
    when('/analyze', {
      templateUrl: '/static/partials/data_set_ui_mode_analyze.html',
      controller: 'WorkflowListApiCtrl'
    });
}]);