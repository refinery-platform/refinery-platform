'use strict';

function NodeDraggableCtrl ($element, $scope) {
  $element.on('dragstart', $scope.handleNodeDragStart);
  $element.on('dragend', $scope.handleNodeDragEnd);
}

angular
  .module('refineryNodeMapping')
  .controller('NodeDraggableCtrl', ['$element', '$scope', NodeDraggableCtrl]);
