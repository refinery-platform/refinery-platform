(function () {
  'use strict';

  angular
    .module('refineryFileBrowser')
    .directive('rpNodeSelectionsPopoverDetails', rpNodeSelectionsPopoverDetails);

  function rpNodeSelectionsPopoverDetails () {
    return {
      restrict: 'E',
      templateUrl: '/static/partials/file-browser/partials/node-selection-popover.html',
    };
  }
})();
