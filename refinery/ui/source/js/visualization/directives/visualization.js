'use strict';

function rpVisualization () {
  return {
    restrict: 'E',
    templateUrl: '/static/partials/visualization/partials/visualization.html',
    controller: 'VisualizationCtrl',
    controllerAs: 'VCtrl',
    bindToController: {
      visualization: '@',
      selectedVisualization: '@'
    },

  };
}

angular
  .module('refineryVisualization')
  .directive('rpVisualization', [
    rpVisualization
  ]
);
