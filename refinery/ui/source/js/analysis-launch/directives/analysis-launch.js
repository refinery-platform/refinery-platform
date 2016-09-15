'use strict';

function rpAnalysisLaunch () {
  return {
    restrict: 'E',
    templateUrl: '/static/partials/analysis-launch/partials/analysis-launch.html'
  };
}

angular
  .module('refineryAnalysisLaunch')
  .directive('rpAnalysisLaunch', [rpAnalysisLaunch]
);
