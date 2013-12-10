'use strict';

//refineryControllers.controller('WorkflowListCtrl', ['$scope', '$http',
//  function WorkflowListCtrl($scope, $http) {
//    $http.get('api/v1/workflow').success(function(data) {
//      $scope.workflows = data;
//    });

refineryControllers.controller('WorkflowListCtrl', function($scope) {
  $scope.workflows = [
    {"id": 1, "name": "Workflow 1"},
    {"id": 2, "name": "Workflow 2"},
  ];
});
