angular.module('refineryAnalysis')
  .controller('AnalysisCtrl',
  [
    '$scope',
    '$log',
    'analysisConfigService',
    AnalysisCtrl
  ]
);

function AnalysisCtrl($scope, $log, analysisConfigService ) {
    "use strict";

  $scope.$onRootScope('nodeSetChangedEvent', function(event, currentNodeSet) {
    console.log("in nodesetchangedevent");
    analysisConfigService.setAnalysisConfig(
      {
        nodeSetUuid: currentNodeSet.uuid,
        nodeRelationshipUuid: null
      });
  });

  $scope.$onRootScope('nodeRelationshipChangedEvent', function(event, currentNodeRelationship) {
    if (!currentNodeRelationship) {
      analysisConfigService.setAnalysisConfig(
      {
        nodeSetUuid: null,
        nodeRelationshipUuid: null
      });
      $log.debug("new noderel undefined");
    }
    else {
      analysisConfigService.setAnalysisConfig(
      {
        nodeSetUuid: null,
        nodeRelationshipUuid: currentNodeRelationship.uuid
      });
    }
  });
}
