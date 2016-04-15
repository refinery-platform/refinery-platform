'use strict';

function treemapDirective () {
  return {
    bindToController: {
      graph: '='
    },
    controller: 'TreemapCtrl',
    controllerAs: 'treemap',
    restrict: 'E',
    replace: true,
    scope: {
      graph: '='
    },
    templateUrl: '/static/partials/commons/treemap/template.html'
  };
}

angular
  .module('treemap')
  .directive('treemap', [
    treemapDirective
  ]);
