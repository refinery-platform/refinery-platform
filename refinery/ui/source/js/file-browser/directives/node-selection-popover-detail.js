(function () {
  'use strict';

  angular
    .module('refineryFileBrowser')
    .directive('rpNodeSelectionPopoverDetail', rpNodeSelectionPopoverDetail);

  function rpNodeSelectionPopoverDetail () {
    return {
      restrict: 'E',
      templateUrl: '/static/partials/file-browser/partials/node-selection-popover-detail.html'
    };
  }
})();
