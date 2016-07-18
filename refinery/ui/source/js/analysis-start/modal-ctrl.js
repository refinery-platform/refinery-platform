'use strict';

function AnalysisStartModalCtrl (
  $log,
  $scope,
  $window,
  $uibModalInstance,
  timeStamp,
  workflow,
  analysisStartConfigService,
  analysisStartFactory
) {
  var nowTimeStamp = timeStamp.getTimeStamp();
  var workflowName = workflow.getName();

  $scope.analysisStartFlag = 'NOCALL';
  $scope.dataObj = {
    name: workflowName + ' ' + nowTimeStamp
  };
  analysisStartConfigService.setAnalysisConfig(
    {
      workflowUuid: workflow.getUuid()
    }
  );

  $scope.ok = function () {
    $scope.analysisStartFlag = 'LOADING';

    if ($scope.tempName !== null) {
      analysisStartConfigService.setAnalysisConfig(
        {
          name: $scope.dataObj.name
        }
      );

      var startParams = analysisStartConfigService.getAnalysisConfig();
      analysisStartFactory.postStartAnalysis(startParams)
        .then(function () {
          $scope.analysisStartFlag = 'SUCCESS';
        }, function (error) {
          $log.log(error);
          $scope.analysisStartFlag = 'FAILED';
        });
    }
  };

  $scope.cancel = function () {
    $uibModalInstance.dismiss('cancel');
  };

  $scope.close = function () {
    $uibModalInstance.close('close');
  };

  $scope.view = function () {
    $uibModalInstance.close('view');
    $window.location.href = '/data_sets/' + $window.dataSetUuid + '/#/analyses';
  };
}

angular
  .module('refineryAnalysisStart')
  .controller('AnalysisStartModalCtrl', [
    '$log',
    '$scope',
    '$window',
    '$uibModalInstance',
    'timeStamp',
    'workflow',
    'analysisStartConfigService',
    'analysisStartFactory',
    AnalysisStartModalCtrl
  ]);
