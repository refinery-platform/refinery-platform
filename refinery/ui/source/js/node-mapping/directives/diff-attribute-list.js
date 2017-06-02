'use strict';

function diffAttributeListDirective ($window) {
  return {
    bindToController: {
      setA: '=',
      setB: '='
    },
    controller: 'DiffAttributeListCtrl',
    controllerAs: 'diffAttributeList',
    restrict: 'A',
    templateUrl: function () {
      return $window.getStaticUrl('partials/node-mapping/directives/diff-attribute-list.html');
    }
  };
}

angular
  .module('refineryNodeMapping')
  .directive('diffAttributeList', ['$window', diffAttributeListDirective]);
