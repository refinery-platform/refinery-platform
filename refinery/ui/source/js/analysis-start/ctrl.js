'use strict';

function AnalysisStartCtrl ($scope, $log, analysisStartConfigService) {
  $scope.$onRootScope('nodeSetChangedEvent', function (event, currentNodeSet) {
    analysisStartConfigService.setAnalysisConfig(
      {
        nodeSetUuid: currentNodeSet.uuid,
        nodeRelationshipUuid: null
      });
  });

  $scope.$onRootScope('nodeRelationshipChangedEvent', function (
    event, currentNodeRelationship
  ) {
    if (!currentNodeRelationship) {
      analysisStartConfigService.setAnalysisConfig(
        {
          nodeSetUuid: null,
          nodeRelationshipUuid: null
        });
      $log.debug('new noderel undefined');
    } else {
      analysisStartConfigService.setAnalysisConfig(
        {
          nodeSetUuid: null,
          nodeRelationshipUuid: currentNodeRelationship.uuid
        });
    }
  });
}

angular
  .module('refineryAnalysisStart')
  .controller('AnalysisStartCtrl', [
    '$scope',
    '$log',
    'analysisStartConfigService',
    AnalysisStartCtrl
  ]);
