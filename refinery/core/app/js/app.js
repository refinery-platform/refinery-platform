//'use strict';

var djangular = angular.module('djangular');

console.log( djangular.DjangoProperties );

// Declare app level module which depends on filters, and services
angular.module('core', ['core.filters', 'core.services', 'core.directives', 'core.controllers']).
  config(['$routeProvider', function($routeProvider) {
    $routeProvider.when('/view1', {templateUrl: '/static/core/partials/partial1.html', controller: 'MyCtrl1'});
    $routeProvider.when('/view2', {templateUrl: '/static/core/partials/partial2.html', controller: 'MyCtrl2'});
    $routeProvider.otherwise({redirectTo: '/view1'});
  }]);
