'use strict';

function rpAnalysisLaunch (staticUrlService) {
  return {
    restrict: 'E',
    templateUrl: function () {
      return staticUrlService.create('partials/analysis-launch/partials/analysis-launch.html');
    }
  };
}

angular
  .module('refineryAnalysisLaunch')
  .directive('rpAnalysisLaunch', ['staticUrlService', rpAnalysisLaunch]
);
