angular.module('refineryAnalyses')
    .directive("analysesList", analysesList);

function analysesList() {
    "use strict";

  return {
    restrict: 'E',
    templateUrl: '/static/partials/analyses/partials/analyses-list.html',
    controller: 'AnalysesCtrl',
    controllerAs: 'AnalysesCtrl',
    bindToController: {
       analysesList: '@',
       analysesDetail: '@'
    },
    link: function(scope, element, attr){
      scope.$on('refinery/analyze-tab-active', function () {
        scope.AnalysesCtrl.updateAnalysesList();
      });
    }
  };
}
