angular.module('refineryApp', [
  'ui.select2',
  'ngResource',
//  'refineryControllers',
])

.factory("Workflow", function($resource) {
  'use strict';

  return $resource(
    "/api/v1/workflow/:Id/",
    {Id: "@Id", format: "json"}
  );
})

.controller('WorkflowListApiCtrl', function($scope, Workflow) {
  'use strict';

  var Workflows = Workflow.get(function() {
    $scope.workflowList = Workflows.objects;
  });

  $scope.workflowSelected = function() {
    return $scope.index === '0' ? true : $scope.index;
    // return $scope.index;
  };

  $scope.getWorkflowInputRelationship = function() {
    if ($scope.workflowList && $scope.index) {
      return $scope.workflowList[$scope.index].input_relationships[0];
    } else {
      return '';
    }
  };

});

//var refineryControllers = angular.module('refineryControllers', []);
//var service = angular.module("apiService", ["ngResource"]);
