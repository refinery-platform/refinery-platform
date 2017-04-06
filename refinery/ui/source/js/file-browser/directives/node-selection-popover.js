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
          toggle: 'popover',
          container: 'body'
        };
        $(element).popover(options);
        // catches all clicks, so popover will hide if you click anywhere other
        // than icon & popover
        $('body').on('click', function (e) {
          // starts api calls if icon is clicked
          if (e.target.id !== scope.uuid &&
            $(e.target).parents('.popover.in').length === 0) {
            $(element).popover('hide');
          }
        });
      }
    };
  }
})();
