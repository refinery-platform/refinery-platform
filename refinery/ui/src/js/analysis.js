angular.module('refineryAnalysis', [])

.controller('AnalysisCtrl', function($scope, analysisConfig) {
  'use strict';

  $scope.launchAnalysis = function() {
    // POST request to either
    // /analysis_manager/run_nodeset/ or
    // /analysis_manager/run_noderelationship/
    console.log("Study UUID: " + analysisConfig.studyUuid);
    console.log("Workflow UUID: " + analysisConfig.workflowUuid);

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
