angular.module('refineryAnalysis')
    .controller('AnalysisModalCtrl',
    [
      '$scope',
      '$modalInstance',
      '$window',
      'timeStamp',
      'workflow',
      'analysisConfigService',
      'analysisLaunchFactory',
      AnalysisModalCtrl
    ]
);


function AnalysisModalCtrl($scope, $modalInstance, $window, timeStamp, workflow, analysisConfigService, analysisLaunchFactory){
  var nowTimeStamp = timeStamp.getTimeStamp();
  var workflowName = workflow.getName();

  $scope.analysisLaunchFlag = "NOCALL";
  $scope.dataObj = {
    "name":workflowName + " " + nowTimeStamp
  };
  analysisConfigService.setAnalysisConfig(
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

      var launchParams = analysisConfigService.getAnalysisConfig();
      analysisLaunchFactory.postLaunchAnalysis(launchParams)
        .then(function(response){
          $scope.analysisLaunchFlag = "SUCCESS";
       }, function(error){
         console.log(error);
          $scope.analysisLaunchFlag = "FAILED";
       });
    }else{
      //add error handling
      console.log("Please enter a valid name");
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
