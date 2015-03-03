angular.module('refineryAnalysis', [])

.controller('AnalysisCtrl', function(
    $scope, $rootScope, $http, $window, $log, $timeout, workflow) {

  'use strict';

  $scope.analysisConfig = {
    studyUuid: $window.externalStudyUuid,
    workflowUuid: null,
    nodeSetUuid: null,
    nodeRelationshipUuid: null
  };

  $scope.$onRootScope('nodeSetChangedEvent', function(event, currentNodeSet) {
    $scope.analysisConfig.nodeSetUuid = currentNodeSet.uuid;
    $scope.analysisConfig.nodeRelationshipUuid = null;
    $log.debug("new nodeset: " + $scope.analysisConfig.nodeSetUuid);
  });

  $scope.$onRootScope('nodeRelationshipChangedEvent', function(event, currentNodeRelationship) {
    if (!currentNodeRelationship) {
      $scope.analysisConfig.nodeRelationshipUuid = null;
      $log.debug("new noderel undefined");
    }
    else {
      $scope.analysisConfig.nodeRelationshipUuid = currentNodeRelationship.uuid;
      $log.debug("new noderel: " + $scope.analysisConfig.nodeRelationshipUuid);
    }

    $scope.analysisConfig.nodeSetUuid = null;
  });

  $scope.launchAnalysis = function() {
    $scope.analysisConfig.workflowUuid = workflow.getUuid();

    $http({
      method: 'POST',
      url: '/analysis_manager/run/',
      headers: {'X-Requested-With': 'XMLHttpRequest'},
      data: $scope.analysisConfig,
    }).success(function(response) {
      $log.debug("Launching analysis with config:");
      $log.debug("Workflow: " + $scope.analysisConfig.workflowUuid);
      $log.debug("NodeSET: " + $scope.analysisConfig.nodeSetUuid);
      $log.debug("NodeREL: " + $scope.analysisConfig.nodeRelationshipUuid);
      $window.location.assign(response);
    }).error(function(response, status) {
      $log.debug("Request failed: error " + status);
    });
  };
});
