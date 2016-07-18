'use strict';

function rpAnalysisStartModal ($compile, $templateCache, $uibModal) {
  return {
    restrict: 'AE',
    controller: 'AnalysisStartCtrl',
    controllerAs: 'analysisStartCtrl',
    link: function (scope, element) {
      element.bind('click', function () {
        var template = $templateCache.get('analysisstartmodal.html');
        var modalContent = $compile(template)(scope);

        $uibModal.open({
          template: modalContent,
          controller: 'AnalysisStartModalCtrl'
        });
      });
    }
  };
}

angular
  .module('refineryAnalysisStart')
  .directive('rpAnalysisStartModal', [
    '$compile',
    '$templateCache',
    '$uibModal',
    rpAnalysisStartModal
  ]);
