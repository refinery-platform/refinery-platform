angular
  .module('refineryAnalysisLaunch')
  .directive(
    'rpAnalysisLaunchModal',
    [
      '$compile',
      '$templateCache',
      '$uibModal',
      rpAnalysisLaunchModal
    ]
  );

function rpAnalysisLaunchModal($compile, $templateCache, $uibModal) {
  "use strict";
  return {
    restrict: 'AE',
    controller: 'AnalysisLaunchCtrl',
    controllerAs: 'analysisLaunchCtrl',
    link: function(scope, element) {

      element.bind("click", function(e) {
        var template = $templateCache.get("analysislaunchmodal.html");
        var modalContent = $compile(template)(scope);

        $uibModal.open({
          template:modalContent,
          controller: 'AnalysisLaunchModalCtrl'
        });

      });
    }
  };
}
