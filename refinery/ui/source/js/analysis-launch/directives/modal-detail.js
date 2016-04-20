'use strict';

function rpAnalysisLaunchModalDetail () {
  return {
    restrict: 'AE',
    templateUrl: '/static/partials/analysis-launch/partials/modal-detail.html'
  };
}

angular
  .module('refineryAnalysisLaunch')
  .directive('rpAnalysisLaunchModalDetail', [
    rpAnalysisLaunchModalDetail
  ]);
