'use strict';

function rpAnalysisLaunch (settings) {
  return {
    restrict: 'E',
    templateUrl: function () {
      return settings.staticURL +
        'partials/analysis-launch/partials/analysis-launch.html';
    }
  };
}

angular
  .module('refineryAnalysisLaunch')
  .directive('rpAnalysisLaunch', ['settings', rpAnalysisLaunch]
);
