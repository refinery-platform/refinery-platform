'use strict';

function listGraphDirective ($window) {
  return {
    bindToController: {
      graphData: '=graph',
      valuePropertyName: '=valuePropertyName',
      customTopbarButtons: '=customTopbarButtons',
      initVis: '=initVis'
    },
    controller: 'ListGraphCtrl',
    controllerAs: 'listGraph',
    restrict: 'E',
    replace: true,
    scope: {
      graphData: '=graph',
      valuePropertyName: '=valuePropertyName'
    },
    templateUrl: function () {
      return $window.getStaticUrl('partials/commons/list-graph/template.html');
    }
  };
}

angular
  .module('listGraph')
  .directive('listGraph', [
    '$window',
    listGraphDirective
  ]);
