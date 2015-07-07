angular.module('refineryCollaborate', [])

.controller('refineryCollaborateController', function ($scope) {
  $scope.foo = 234;
})

.directive('collaborateDisplay', function () {
  return {
    templateUrl: '/static/partials/collaborate.tpls.html',
    restrict: 'A'
  };
});