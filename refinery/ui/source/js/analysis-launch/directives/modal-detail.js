'use strict';

angular
  .module('refineryAnalysisLaunch')
  .directive(
    'rpAnalysisLaunchModalDetail',
    [
      rpAnalysisLaunchModalDetail
    ]
);

function rpAnalysisLaunchModalDetail () {
  return {
    restrict: 'AE',
    templateUrl: '/static/partials/analysis-launch/partials/modal-detail.html'
  };
}
