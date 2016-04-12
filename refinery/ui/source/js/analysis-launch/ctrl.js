'use strict';

function AnalysisLaunchCtrl ($scope, $log, analysisLaunchConfigService) {
  $scope.$onRootScope('nodeSetChangedEvent', function (event, currentNodeSet) {
    analysisLaunchConfigService.setAnalysisConfig(
      {
        nodeSetUuid: currentNodeSet.uuid,
        nodeRelationshipUuid: null
      });
  });

  $scope.$onRootScope('nodeRelationshipChangedEvent', function (
    event, currentNodeRelationship
  ) {
    if (!currentNodeRelationship) {
      analysisLaunchConfigService.setAnalysisConfig(
        {
          nodeSetUuid: null,
          nodeRelationshipUuid: null
        });
      $log.debug('new noderel undefined');
    } else {
      analysisLaunchConfigService.setAnalysisConfig(
        {
          nodeSetUuid: null,
          nodeRelationshipUuid: currentNodeRelationship.uuid
        });
    }
  });
}

angular
  .module('refineryAnalysisLaunch')
  .controller('AnalysisLaunchCtrl', [
    '$scope',
    '$log',
    'analysisLaunchConfigService',
    AnalysisLaunchCtrl
  ]);
