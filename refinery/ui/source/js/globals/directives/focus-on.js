'use strict';

function focusOnDirective () {
  return function (scope, element, attributes) {
    scope.$on('focusOn', function (event, name) {
      if (name === attributes.focusOn) {
        element[0].focus();
      }
    });
  };
}

angular
  .module('focusOn', [])
  .directive('focusOn', [focusOnDirective]);
