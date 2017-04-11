'use strict';

function rpVisualization ($window) {
  return {
    restrict: 'E',
    templateUrl: function () {
      return $window.getStaticUrl('partials/visualization/partials/visualization.html');
    },
    controller: 'VisualizationCtrl',
    controllerAs: 'VCtrl',
    bindToController: {
      visualization: '@',
      selectedVisualization: '@'
    }
  };
}

angular
  .module('refineryVisualization')
  .directive('rpVisualization', [
    '$window',
    rpVisualization
  ]
);
