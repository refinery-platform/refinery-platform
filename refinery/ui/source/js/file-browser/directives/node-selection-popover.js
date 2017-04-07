(function () {
  'use strict';

  angular
  .module('refineryFileBrowser')
  .directive('rpNodeSelectionPopover', rpNodeSelectionPopover);

  rpNodeSelectionPopover.$inject = [
    '$',
    '$compile',
    '$rootScope',
    '$templateCache'
  ];

  function rpNodeSelectionPopover (
    $,
    $compile,
    $rootScope,
    $templateCache
    ) {
    return {
      restrict: 'AE',
      scope: {
        uuid: '='
      },
      link: function (scope, element) {
        // The script is in the base.html template.
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
        $(element).popover(options);

        scope.closeSelectionPopover = function () {
          $(element).popover('hide');
          $('.ui-grid-selection-row-header-buttons').popover('enable');
        };
      }
    };
  }
})();
