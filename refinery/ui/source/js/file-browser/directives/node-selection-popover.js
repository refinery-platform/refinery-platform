(function () {
  'use strict';

  angular
  .module('refineryFileBrowser')
  .directive('rpNodeSelectionPopover', rpNodeSelectionPopover);

  rpNodeSelectionPopover.$inject = [
    '$compile',
    '$rootScope',
    '$templateCache'
  ];

  function rpNodeSelectionPopover (
    $compile,
    $rootScope,
    $templateCache
    ) {
    return {
      restrict: 'AE',
      link: function (scope, element) {
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
          angular.element(element).popover('hide');
          angular.element('.ui-grid-selection-row-header-buttons').popover('enable');
        };
      }
    };
  }
})();
