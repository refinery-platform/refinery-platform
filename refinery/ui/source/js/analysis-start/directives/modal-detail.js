'use strict';

function rpAnalysisStartModalDetail () {
  return {
    restrict: 'AE',
    templateUrl: '/static/partials/analysis-start/partials/modal-detail.html'
  };
}

angular
  .module('refineryAnalysisStart')
  .directive('rpAnalysisStartModalDetail', [
    rpAnalysisStartModalDetail
  ]);
