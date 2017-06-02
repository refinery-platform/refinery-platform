'use strict';

function treemapDirective ($window) {
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
    templateUrl: function () {
      return $window.getStaticUrl('partials/commons/treemap/template.html');
    }
  };
}

angular
  .module('treemap')
  .directive('treemap', [
    '$window',
    treemapDirective
  ]);
