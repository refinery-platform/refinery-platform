(function () {
  'use strict';

  angular
    .module('refineryFileBrowser')
    .directive('rpNodeSelectionPopoverDetail', rpNodeSelectionPopoverDetail);

  rpNodeSelectionPopoverDetail.$inject = ['$window'];

  function rpNodeSelectionPopoverDetail ($window) {
    return {
      restrict: 'E',
      controller: 'NodeSelectionPopoverCtrl',
      controllerAs: 'NSPCtrl',
      templateUrl: function () {
        return $window.getStaticUrl(
          'partials/file-browser/partials/node-selection-popover-detail.html'
        );
      }
    };
  }
})();
