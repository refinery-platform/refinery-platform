'use strict';

function rpSelectNodesCount (selectedNodesService) {
  return {
    restrict: 'AE',
    templateUrl: '/static/partials/file-browser/partials/select-nodes-count.html',
    link: function (scope) {
      // For angular 1.5, should minimize watchers.
      scope.$watch(
        function () {
          return selectedNodesService.selectNodesCount;
        },
        function () {
          scope.selectNodesCount = selectedNodesService.selectNodesCount;
          scope.assayFilesTotal = selectedNodesService.assayFilesTotal;
        }
      );

      scope.$watch(
        function () {
          return selectedNodesService.assayFilesTotal;
        },
        function () {
          scope.assayFilesTotal = selectedNodesService.assayFilesTotal;
        }
      );
    }
  };
}

angular
  .module('refineryFileBrowser')
  .directive('rpSelectNodesCount', [
    'selectedNodesService',
    rpSelectNodesCount
  ]
);
