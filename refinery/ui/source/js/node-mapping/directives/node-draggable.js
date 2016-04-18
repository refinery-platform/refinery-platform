'use strict';

// http://jsfiddle.net/jgoemat/CPRda/1/
function nodeDraggableDirective () {
  return {
    controller: 'NodeDraggableCtrl',
    restrict: 'A'
  };
}

angular
  .module('refineryNodeMapping')
  .directive('nodeDraggable', nodeDraggableDirective);
