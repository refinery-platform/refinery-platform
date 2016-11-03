'use strict';

function listGraphDirective () {
  return {
    bindToController: {
      graphData: '=graph',
      valuePropertyName: '=valuePropertyName',
      customTopbarButtons: '=customTopbarButtons',
      initVisDepth: '=initVisDepth'
    },
    controller: 'ListGraphCtrl',
    controllerAs: 'listGraph',
    restrict: 'E',
    replace: true,
    templateUrl: '/static/partials/commons/list-graph/template.html'
  };
}

angular
  .module('listGraph')
  .directive('listGraph', [
    listGraphDirective
  ]);
