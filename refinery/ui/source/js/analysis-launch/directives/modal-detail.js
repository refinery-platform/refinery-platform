angular
  .module('refineryAnalysisLaunch')
  .directive(
    'rpAnalysisLaunchModalDetail',
    [
      '$log',
      '$modal',
      rpAnalysisLaunchModalDetail
    ]
  );

function rpAnalysisLaunchModalDetail( $log, $modal) {
  "use strict";
    return {
    restrict: 'AE',
    templateUrl: '/static/partials/analysis-launch/partials/modal-detail.html',
    };
}
