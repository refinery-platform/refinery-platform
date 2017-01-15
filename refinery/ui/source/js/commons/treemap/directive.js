'use strict';

function treemapDirective () {
  return {
    bindToController: {
      graph: '=',
      introJs: '='
    },
    controller: 'TreemapCtrl',
    controllerAs: 'treemap',
    restrict: 'E',
    replace: true,
    scope: {
      graph: '=',
      introJs: '='
    },
    templateUrl: '/static/partials/commons/treemap/template.html'
  };
}

angular
  .module('treemap')
  .directive('treemap', [
    treemapDirective
  ]);
