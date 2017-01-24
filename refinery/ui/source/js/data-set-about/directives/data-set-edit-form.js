'use strict';

function rpDataSetEditForm () {
  return {
    restrict: 'A',
    templateUrl: '/static/partials/data-set-about/partials/data-set-edit-form.html',
    link: function (scope) {
      // if an analysis is launched, then the running list needs to be updated.
      scope.AMCtrl.updateAnalysesRunningList();
      scope.$on('rf/launchAnalysis', function () {
        scope.AMCtrl.launchAnalysisFlag = true;
      });

      scope.$on('rf/cancelAnalysis', function () {
        scope.AMCtrl.cancelTimerRunningList();
        scope.AMCtrl.updateAnalysesRunningList();
      });
    }
  };
}

angular
  .module('refineryDataSetAbout')
  .directive('rpDataSetEditForm', [
    rpDataSetEditForm
  ]);
