angular
  .module('refineryAnalysis')
  .directive(
    'rfAnalysisLaunchModal',
    [
      '$window',
      '$compile',
      '$templateCache',
      '$log',
      '$modal',
      'timeStamp',
      'workflow',
      rfAnalysisLaunchModal
    ]
  );

function rfAnalysisLaunchModal($window, $compile, $templateCache,$log, $modal, timeStamp, workflow) {
  "use strict";
    return {
      restrict: 'AE',
      controller: 'AnalysisCtrl',
      controllerAs: 'AnalysisCtrl',
      replace: false,
      link: function(scope, element, attrs) {

        var analysisConfig = {
          studyUuid: $window.externalStudyUuid,
          workflowUuid: null,
          nodeSetUuid: null,
          nodeRelationshipUuid: null,
          name: null,
        };

         scope.$onRootScope('nodeSetChangedEvent', function(event, currentNodeSet) {
          analysisConfig.nodeSetUuid = currentNodeSet.uuid;
          analysisConfig.nodeRelationshipUuid = null;
        });

        scope.$onRootScope('nodeRelationshipChangedEvent', function(event, currentNodeRelationship) {
          if (!currentNodeRelationship) {
            analysisConfig.nodeRelationshipUuid = null;
            analysisConfig.nodeRelationshipUuid = null;
          }
          else {
            analysisConfig.nodeRelationshipUuid = currentNodeRelationship.uuid;
          }
          analysisConfig.nodeSetUuid = null;
        });

        element.bind("click", function(e) {
          var nowTimeStamp = timeStamp.getTimeStamp();
          var workflowName = workflow.getName();
          var template = $templateCache.get("analysislaunchmodal.html");
          var modalContent = $compile(template)(scope);

          $modal.open({
            template:modalContent,
            controller: function($scope, $modalInstance) {
            //  $scope.analysisCtrl.setAnalysisName();
              $scope.dataObj = {
                "name":workflowName + " " + nowTimeStamp
              };
              analysisConfig.workflowUuid = workflow.getUuid();
              $scope.ok = function () {
                if($scope.tempName !== null){
                  analysisConfig.name = $scope.dataObj.name;
                  scope.analysisCtrl.launchAnalysis(analysisConfig)
                    .then(function(response){
                      $modalInstance.close('ok');
                   }, function(error){
                     console.log(error);
                   });
                }else{
                  console.log("Please enter a valid name");
                }
              };
              $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
              };
            }
          });
          });
        }
    };
}
