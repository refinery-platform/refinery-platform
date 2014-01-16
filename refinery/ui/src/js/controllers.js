angular.module('refineryControllers', [])

.controller('WorkflowListApiCtrl', function($scope, Workflow) {
  'use strict';

  var Workflows = Workflow.get(function() {
    $scope.workflowList = Workflows.objects;
  });

  $scope.updateCurrentWorkflow = function() {
    $scope.currentWorkflow = $scope.workflowList[$scope.workflowIndex];

    if ( $scope.isCurrentWorkflowSingleInput() ) {
      $scope.currentWorkflow.input_relationships[0].category = "File Set";
    }
    else {      
      $scope.currentWorkflow.input_relationships[0].category = $scope.currentWorkflow.input_relationships[0].category + " File Mapping";
    }

  };

  $scope.isCurrentWorkflowSingleInput = function() {
    if ($scope.currentWorkflow) {
      return $scope.currentWorkflow.input_relationships[0].set2 ? false : true;
    }
  };
})

.controller('NodeSetListApiCtrl', function($scope, NodeSetList) {
  'use strict';

  var NodeSets = NodeSetList.get(
    {study__uuid: externalStudyUuid, assay__uuid: externalAssayUuid},
    function() {
      $scope.nodesetList = NodeSets.objects;
  });

  $scope.updateCurrentNodeSet = function() {
    $scope.currentNodeSet = $scope.nodesetList[$scope.nodesetIndex];  
  };
})

.controller('NodeMappingListApiCtrl', function($scope, NodeMappingList) {
  'use strict';

  var NodeMappings = NodeMappingList.get(
    {study__uuid: externalStudyUuid, assay__uuid: externalAssayUuid},
    function() {
      $scope.nodemappingList = NodeMappings.objects;
  });

  $scope.updateCurrentNodeMapping = function() {
    $scope.currentNodeMapping = $scope.nodemappingList[$scope.nodemappingIndex];  
  };  
});

