angular
  .module('refineryNodeMapping')
  .directive('nodeDroppable', [function () {
    return {
      restrict: 'A',
      link: function (scope, element, attrs) {
        element[0].addEventListener('drop', scope.handleNodeDrop, false);
        element[0].addEventListener('dragover', scope.handleNodeDragOver, false);
        element[0].addEventListener('dragenter', scope.handleNodeDragEnter, false);
        element[0].addEventListener('dragleave', scope.handleNodeDragLeave, false);
      }
    };
  }]);
