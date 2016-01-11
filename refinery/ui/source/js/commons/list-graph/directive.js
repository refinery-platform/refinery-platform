function listGraphDirective () {
  'use strict';

  return {
    bindToController: {
      graphData: '=graph',
      rootIds: '=root'
    },
    controller: 'ListGraphCtrl',
    controllerAs: 'listGraph',
    restrict: 'E',
    replace: true,
    scope: {
      graphData: '=graph',
      rootIds: '=root'
    },
    templateUrl: '/static/partials/commons/list-graph/template.html'
  };
}

angular
  .module('listGraph')
  .directive('listGraph', [
    listGraphDirective
  ]);
