'use strict';

function NodeDroppableCtrl ($element, $scope) {
  $element.on('drop', $scope.handleNodeDrop);
  $element.on('dragover', $scope.handleNodeDragOver);
  $element.on('dragenter', $scope.handleNodeDragEnter);
  $element.on('dragleave', $scope.handleNodeDragLeave);
}

angular
  .module('refineryNodeMapping')
  .controller('NodeDroppableCtrl', ['$element', '$scope', NodeDroppableCtrl]);
