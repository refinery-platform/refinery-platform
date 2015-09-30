angular.module('refineryAnalysisLaunch')
    .controller('AnalysisLaunchModalCtrl',
    [
      '$scope',
      '$modalInstance',
      '$window',
      'timeStamp',
      'workflow',
      'analysisConfigService',
      'analysisLaunchFactory',
      AnalysisLaunchModalCtrl
    ]
);


function AnalysisLaunchModalCtrl(
  $scope,
  $modalInstance,
  $window, timeStamp,
  workflow,
  analysisLaunchConfigService,
  analysisLaunchFactory
){
  var nowTimeStamp = timeStamp.getTimeStamp();
  var workflowName = workflow.getName();

  $scope.analysisLaunchFlag = "NOCALL";
  $scope.dataObj = {
    "name":workflowName + " " + nowTimeStamp
  };
  analysisLaunchConfigService.setAnalysisConfig(
    {
      workflowUuid: workflow.getUuid()
      }
  );

  $scope.ok = function () {
    $scope.analysisLaunchFlag = "LOADING";

    if($scope.tempName !== null){

      analysisConfigService.setAnalysisConfig(
        {
          name:$scope.dataObj.name
        }
      );

      var launchParams = analysisLaunchConfigService.getAnalysisConfig();
      analysisLaunchFactory.postLaunchAnalysis(launchParams)
        .then(function(response){
          $scope.analysisLaunchFlag = "SUCCESS";
       }, function(error){
         console.log(error);
          $scope.analysisLaunchFlag = "FAILED";
       });
    }
  };

  $scope.cancel = function () {
    $modalInstance.dismiss('cancel');
  };

  $scope.close = function () {
    $modalInstance.close('close');
  };

  $scope.view = function () {
    $modalInstance.close('view');
    $window.location.href = '/data_sets/' + dataSetUuid + '/#/analyses';
  };

}
