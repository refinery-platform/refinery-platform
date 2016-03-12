// http://jsfiddle.net/jgoemat/CPRda/1/
angular
  .module('refineryNodeMapping')
  .directive('nodeDraggable', [function () {
    return {
      restrict: 'A',
      link: function (scope, element, attrs) {
        element[0].addEventListener('dragstart', scope.handleNodeDragStart, false);
        element[0].addEventListener('dragend', scope.handleNodeDragEnd, false);
      }
    };
  }]);
