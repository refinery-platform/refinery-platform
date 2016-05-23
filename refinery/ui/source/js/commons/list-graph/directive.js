'use strict';

function listGraphDirective () {
  return {
    bindToController: {
      graphData: '=graph',
      valuePropertyName: '=valuePropertyName'
    },
    controller: 'ListGraphCtrl',
    controllerAs: 'listGraph',
    restrict: 'E',
    replace: true,
    scope: {
      graphData: '=graph',
      valuePropertyName: '=valuePropertyName'
    },
    templateUrl: '/static/partials/commons/list-graph/template.html'
  };
}

angular
  .module('listGraph')
  .directive('listGraph', [
    listGraphDirective
  ]);
