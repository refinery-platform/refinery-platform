'use strict';

function nodeDroppableDirective () {
  return {
    controller: 'NodeDroppableCtrl',
    restrict: 'A'
  };
}

angular
  .module('refineryNodeMapping')
  .directive('nodeDroppable', nodeDroppableDirective);
