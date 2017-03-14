'use strict';

function rpAnalysisLaunch ($window) {
  return {
    restrict: 'E',
    templateUrl: function () {
      return $window.staticURL('partials/analysis-launch/partials/analysis-launch.html');
    }
  };
}

angular
  .module('refineryAnalysisLaunch')
  .directive('rpAnalysisLaunch', ['$window', rpAnalysisLaunch]
);
