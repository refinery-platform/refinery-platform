'use strict';

function rpAnalysisLaunch (urlService) {
  return {
    restrict: 'E',
    templateUrl: function () {
      return urlService.static('partials/analysis-launch/partials/analysis-launch.html');
    }
  };
}

angular
  .module('refineryAnalysisLaunch')
  .directive('rpAnalysisLaunch', ['urlService', rpAnalysisLaunch]
);
