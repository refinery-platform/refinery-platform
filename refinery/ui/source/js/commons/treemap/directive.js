function treemapDirective () {
  'use strict';

  return {
    controller: 'TreemapCtrl',
    controllerAs: 'treemap',
    restrict: 'E',
    replace: true,
    templateUrl: '/static/partials/commons/treemap/template.html'
  };
}

angular
  .module('treemap')
  .directive('treemap', [
    treemapDirective
  ]);
