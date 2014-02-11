angular.module('refineryAnalysis', [])

.controller('AnalysisCtrl', function($scope, $rootScope, $http, $window, analysisConfig) {
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
    $http({
      method: 'POST',
      url: '/analysis_manager/run/',
      headers: {'X-Requested-With': 'XMLHttpRequest'},
      data: analysisConfig,
    }).success(function(response) {
      $window.location.assign(response);
    }).error(function(response, status) {
      console.log("Request failed: error " + status);
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
});
