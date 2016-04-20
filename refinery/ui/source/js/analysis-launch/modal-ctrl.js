'use strict';

function AnalysisLaunchModalCtrl (
  $log,
  $scope,
  $window,
  $uibModalInstance,
  timeStamp,
  workflow,
  analysisLaunchConfigService,
  analysisLaunchFactory
) {
  var nowTimeStamp = timeStamp.getTimeStamp();
  var workflowName = workflow.getName();

  $scope.analysisLaunchFlag = 'NOCALL';
  $scope.dataObj = {
    name: workflowName + ' ' + nowTimeStamp
  };
  analysisLaunchConfigService.setAnalysisConfig(
    {
      workflowUuid: workflow.getUuid()
    }
  );

  $scope.ok = function () {
    $scope.analysisLaunchFlag = 'LOADING';

    if ($scope.tempName !== null) {
      analysisLaunchConfigService.setAnalysisConfig(
        {
          name: $scope.dataObj.name
        }
      );

      var launchParams = analysisLaunchConfigService.getAnalysisConfig();
      analysisLaunchFactory.postLaunchAnalysis(launchParams)
        .then(function () {
          $scope.analysisLaunchFlag = 'SUCCESS';
        }, function (error) {
          $log.log(error);
          $scope.analysisLaunchFlag = 'FAILED';
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
  .module('refineryAnalysisLaunch')
  .controller('AnalysisLaunchModalCtrl', [
    '$log',
    '$scope',
    '$window',
    '$uibModalInstance',
    'timeStamp',
    'workflow',
    'analysisLaunchConfigService',
    'analysisLaunchFactory',
    AnalysisLaunchModalCtrl
  ]);
