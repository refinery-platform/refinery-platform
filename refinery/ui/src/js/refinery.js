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

  $scope.updateCurrentWorkflow = function() {
    $scope.currentWorkflow = $scope.workflowList[$scope.workflowIndex];
  };

  $scope.isCurrentWorkflowSingleInput = function() {
    if ($scope.currentWorkflow) {
      return $scope.currentWorkflow.input_relationships[0].set2 ? false : true;
    }
  };
})

.factory("NodeSet", function($resource) {
  'use strict';

  return $resource(
    "/api/v1/nodeset/:Id/",
    {Id: "@Id", format: "json"}
  );
})

.controller('NodeSetListApiCtrl', function($scope, NodeSet) {
  'use strict';

  var NodeSets = NodeSet.get(function() {
    $scope.nodesetList = NodeSets.objects;
  });
});

//var refineryControllers = angular.module('refineryControllers', []);
//var service = angular.module("apiService", ["ngResource"]);
