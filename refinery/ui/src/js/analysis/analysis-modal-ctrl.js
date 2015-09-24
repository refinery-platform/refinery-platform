angular.module('refineryAnalysis')
    .controller('AnalysisModalCtrl',
    ['$scope', '$modalInstance', AnalysisModalCtrl]);


function AnalysesCtrl($scope, $modalInstance){
  $scope.analysisLaunchFlag = "NOCALL";
  $scope.dataObj = {
    "name":workflowName + " " + nowTimeStamp
  };
  analysisConfig.workflowUuid = workflow.getUuid();
  $scope.ok = function () {
    $scope.analysisLaunchFlag = "LOADING";
    if($scope.tempName !== null){
      analysisConfig.name = $scope.dataObj.name;
      scope.analysisCtrl.launchAnalysis(analysisConfig)
        .then(function(response){
          $scope.analysisLaunchFlag = "COMPLETE";
       }, function(error){
         console.log(error);
          $scope.analysisLaunchFlag = "COMPLETE";
       });
    }else{
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
