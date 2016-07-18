'use strict';

function AnalysisLaunchModalCtrl (
  $log,
  $scope,
  $window,
  $uibModalInstance,
  timeStamp,
  workflow,
  analysisLaunchConfigService,
  analysisLaunchFactory,
  selectedNodesService
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
      var paramsObj = {
        name: $scope.dataObj.name
      };
      if (selectedNodesService.nodeGroupUuid.length > 0) {
        paramsObj.nodeGroupUuid = selectedNodesService.nodeGroupUuid;
      }
      analysisLaunchConfigService.setAnalysisConfig(paramsObj);
      var launchParams = analysisLaunchConfigService.getAnalysisConfig();
      console.log('launch params');
      console.log(launchParams);
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
    'selectedNodesService',
    AnalysisLaunchModalCtrl
  ]);
