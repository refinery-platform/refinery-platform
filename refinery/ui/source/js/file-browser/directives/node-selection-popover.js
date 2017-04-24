(function () {
  'use strict';

  angular
  .module('refineryFileBrowser')
  .directive('rpNodeSelectionPopover', rpNodeSelectionPopover);

  rpNodeSelectionPopover.$inject = [
    '$compile',
    '$rootScope',
    '$templateCache',
    'fileRelationshipService'
  ];

  function rpNodeSelectionPopover (
    $compile,
    $rootScope,
    $templateCache,
    fileRelationshipService
    ) {
    return {
      restrict: 'AE',
      link: function (scope, element) {
        var fileService = fileRelationshipService;
        // The script is in the data_set2.html template.
        var template = $templateCache.get('nodeselectionpopover.html');
        var popOverContent = $compile(template)(scope);
        $rootScope.insidePopover = false;
        var options = {
          content: popOverContent,
          placement: 'right',
          html: true,
          trigger: 'manual',
          container: 'body'
        };
        angular.element(element).popover(options);

        scope.closeSelectionPopover = function () {
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
