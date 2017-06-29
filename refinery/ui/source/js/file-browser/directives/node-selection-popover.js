(function () {
  'use strict';

  angular
  .module('refineryFileBrowser')
  .directive('rpNodeSelectionPopover', rpNodeSelectionPopover);

  rpNodeSelectionPopover.$inject = [
    '$compile',
    '$rootScope',
    '$templateCache',
    'activeNodeService',
    'fileRelationshipService'
  ];

  function rpNodeSelectionPopover (
    $compile,
    $rootScope,
    $templateCache,
    activeNodeService,
    fileRelationshipService
    ) {
    return {
      restrict: 'AE',
      link: function (scope, element) {
        var fileService = fileRelationshipService;
        var nodesService = activeNodeService;
        // The script is in the data_set2.html template.
        var template = $templateCache.get('nodeselectionpopover.html');
        var popOverContent = $compile(template)(scope);
        var options = {
          content: popOverContent,
          placement: 'bottom',
          html: true,
          trigger: 'manual',
          container: '#assay-files-table',
          class: 'node-selection-popover'

        };
        angular.element(element).popover(options);

        // Method for resetting the selected now and hiding the popover
        scope.closeSelectionPopover = function () {
          angular.copy({}, nodesService.activeNodeRow);
          angular.element('.popover').popover('hide');
          angular.element('.ui-grid-selection-row-header-buttons').popover('enable');
        };

        // When the remove/remove all events occur in the tool control
        // panel, the open popovers can freeze. So need a watcher to trigger
        // when these events occur which manually resets them.
        scope.$watch(
          function () {
            return fileService.hideNodePopover;
          },
          function () {
            if (fileService.hideNodePopover) {
              scope.closeSelectionPopover();
              fileService.hideNodePopover = false;
            }
          }
        );
      }
    };
  }
})();
