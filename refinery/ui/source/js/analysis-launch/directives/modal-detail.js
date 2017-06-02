'use strict';

function rpAnalysisLaunchModalDetail ($window) {
  return {
    restrict: 'AE',
    templateUrl: function () {
      return $window.getStaticUrl('partials/analysis-launch/partials/modal-detail.html');
    }
  };
}

angular
  .module('refineryAnalysisLaunch')
  .directive('rpAnalysisLaunchModalDetail', [
    '$window',
    rpAnalysisLaunchModalDetail
  ]);
