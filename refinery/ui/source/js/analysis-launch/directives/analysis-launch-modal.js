angular
  .module('refineryAnalysisLaunch')
  .directive(
    'rfAnalysisLaunchModal',
    [
      '$compile',
      '$templateCache',
      '$modal',
      'analysisConfigService',
      rfAnalysisLaunchModal
    ]
  );

function rfAnalysisLaunchModal($compile, $templateCache, $modal, analysisConfigService) {
  "use strict";
  return {
    restrict: 'AE',
    controller: 'AnalysisLaunchCtrl',
    controllerAs: 'analysisLaunchCtrl',
    link: function(scope, element, attrs) {

      element.bind("click", function(e) {
        var template = $templateCache.get("analysislaunchmodal.html");
        var modalContent = $compile(template)(scope);

        $modal.open({
          template:modalContent,
          controller: 'AnalysisLaunchModalCtrl'
        });
      });
    }
  };
}
