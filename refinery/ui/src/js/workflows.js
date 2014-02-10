angular.module('refineryWorkflows', [])

.controller('WorkflowListApiCtrl', function($scope, $rootScope, workflowApi, analysisConfig) {
  'use strict';

  $scope.getWorkflowList = function() {
    console.log("Getting the workflow list");
    var Workflows = workflowApi.get(function() {
      $scope.workflowList = Workflows.objects;
    });
  };

  $scope.getWorkflowList();

  $scope.updateCurrentWorkflow = function() {
    $scope.currentWorkflow = $scope.workflowList[$scope.workflowIndex];

    if ($scope.currentWorkflow) {
      if ($scope.isCurrentWorkflowSingleInput()) {
        $scope.currentWorkflow.input_relationships[0].category = "File Set";
      }
      else {      
        $scope.currentWorkflow.input_relationships[0].category = $scope.currentWorkflow.input_relationships[0].category + " File Mapping";
      }
      analysisConfig.workflowUuid = $scope.currentWorkflow.uuid;
      $rootScope.$emit( "workflowChangedEvent", $scope.currentWorkflow );    
    }
  };

  $scope.isCurrentWorkflowSingleInput = function() {
    if ($scope.currentWorkflow) {
      return $scope.currentWorkflow.input_relationships[0].set2 ? false : true;
    }

    return true;
  };

  $scope.getCurrentWorkflowInputCount = function() {
    if ($scope.currentWorkflow) {
      console.log( $scope.currentWorkflow.input_relationships[0].set2 ? 2 : 1 );
      return $scope.currentWorkflow.input_relationships[0].set2 ? 2 : 1;
    }

    return null;
  };

})

.factory("workflowApi", function($resource) {
  'use strict';

  return $resource(
    "/api/v1/workflow/", {format: "json"}
  );
});
