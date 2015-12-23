function listGraphDirective () {
  'use strict';

  return {
    bindToController: {
      graphData: '=graph'
    },
    controller: 'ListGraphCtrl',
    controllerAs: 'listGraph',
    restrict: 'E',
    replace: true,
    scope: {
      graphData: '=graph'
    },
    templateUrl: '/static/partials/commons/list-graph/template.html'
  };
}

angular
  .module('listGraph')
  .directive('listGraph', [
    listGraphDirective
  ]);
