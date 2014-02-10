angular.module('refineryAnalysis', [])

.controller('AnalysisCtrl', function($scope, $rootScope, $http, analysisConfig) {
  'use strict';

  // FIXME: workflowChangedEvent is not received when a workflow is selected
  // for the very first time
  // $scope.$onRootScope('workflowChangedEvent', function(event, currentWorkflow) {
    // console.log("Updating workflow UUID");
    // analysisConfig.workflowUuid = currentWorkflow.uuid;  
  // });
  // $scope.$onRootScope('nodeRelationshipChangedEvent', function(event, currentNodeRelationship) {
    // $scope.currentNodeRelationship = currentNodeRelationship;
  // });

  $scope.launchAnalysis = function() {

    console.log("Study UUID: " + analysisConfig.studyUuid);
    console.log("Workflow UUID: " + analysisConfig.workflowUuid);
    console.log("NodeSet UUID: " + analysisConfig.nodeSetUuid);
    console.log("NodeRelationship UUID: " + analysisConfig.nodeRelationshipUuid);

    // POST request to either
    // /analysis_manager/run_nodeset/ or
    // /analysis_manager/run_noderelationship/
    $http({
      method: 'POST',
      url: '/analysis_manager/run_nodeset/',
      data: {
        'study_uuid': analysisConfig.studyUuid,
        'workflow_id': analysisConfig.workflowUuid,
        'node_set_uuid': analysisConfig.nodeSetUuid,
        },
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        }
    }).success(function(data) {
      console.log("Redirecting to: " + data);
      $window.location.href(data);
    }).error(function(data, status) {
      console.log("Request failed: " + data);
      console.log("Status: " + status);
    });
  };
})

.factory('analysisConfig', function() {
  'use strict';

  return {
    studyUuid: externalStudyUuid,
    workflowUuid: null,
    nodeSetUuid: null,
    nodeRelationshipUuid: null
  };
})

.factory('analysisLaunch', function($http) {
  'use strict';

  return {};
});
