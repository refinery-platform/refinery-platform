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
          controller: 'AnalysisModalCtrl'
        });
      });
    }
  };
}
