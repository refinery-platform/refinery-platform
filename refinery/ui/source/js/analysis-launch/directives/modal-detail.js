angular
  .module('refineryAnalysisLaunch')
  .directive(
    'rpAnalysisLaunchModalDetail',
    [
      rpAnalysisLaunchModalDetail
    ]
  );

function rpAnalysisLaunchModalDetail( ) {
  "use strict";
    return {
    restrict: 'AE',
    templateUrl: '/static/partials/analysis-launch/partials/modal-detail.html',
    };
}
