'use strict';

function diffAttributeListDirective () {
  return {
    bindToController: {
      setA: '=',
      setB: '='
    },
    controller: 'DiffAttributeListCtrl',
    controllerAs: 'diffAttributeList',
    restrict: 'A',
    templateUrl: '/static/partials/node-mapping/directives/diff-attribute-list.html'
  };
}

angular
  .module('refineryNodeMapping')
  .directive('diffAttributeList', diffAttributeListDirective);
