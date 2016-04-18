'use strict';

function rpAnalysisLaunchModal ($compile, $templateCache, $uibModal) {
  return {
    restrict: 'AE',
    controller: 'AnalysisLaunchCtrl',
    controllerAs: 'analysisLaunchCtrl',
    link: function (scope, element) {
      element.bind('click', function () {
        var template = $templateCache.get('analysislaunchmodal.html');
        var modalContent = $compile(template)(scope);

        $uibModal.open({
          template: modalContent,
          controller: 'AnalysisLaunchModalCtrl'
        });
      });
    }
  };
}

angular
  .module('refineryAnalysisLaunch')
  .directive('rpAnalysisLaunchModal', [
    '$compile',
    '$templateCache',
    '$uibModal',
    rpAnalysisLaunchModal
  ]);
