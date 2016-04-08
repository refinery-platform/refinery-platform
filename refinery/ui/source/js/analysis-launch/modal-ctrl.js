'use strict';

angular.module('refineryAnalysisLaunch')
  .controller('AnalysisLaunchModalCtrl',
    [
      '$scope',
      '$uibModalInstance',
      '$window',
      'timeStamp',
      'workflow',
      'analysisLaunchConfigService',
      'analysisLaunchFactory',
      AnalysisLaunchModalCtrl
    ]
);


function AnalysisLaunchModalCtrl (
  $scope,
  $uibModalInstance,
  $window, timeStamp,
  workflow,
  analysisLaunchConfigService,
  analysisLaunchFactory
) {
  var nowTimeStamp = timeStamp.getTimeStamp();
  var workflowName = workflow.getName();

  $scope.analysisLaunchFlag = 'NOCALL';
  $scope.dataObj = {
    'name': workflowName + ' ' + nowTimeStamp
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
        .then(function (response) {
          $scope.analysisLaunchFlag = 'SUCCESS';
        }, function (error) {
          console.log(error);
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
    $window.location.href = '/data_sets/' + dataSetUuid + '/#/analyses';
  };

}
