(function () {
  'use strict';

  angular
    .module('refineryFileBrowser')
    .directive('rpInputGroupsColumnPopoverDetail', rpInputGroupsColumnPopoverDetail);

  rpInputGroupsColumnPopoverDetail.$inject = ['$window'];

  function rpInputGroupsColumnPopoverDetail ($window) {
    return {
      restrict: 'E',
      controller: 'InputGroupsColumnPopoverCtrl',
      controllerAs: 'IGCCtrl',
      templateUrl: function () {
        return $window.getStaticUrl(
          'partials/file-browser/partials/input-groups-column-popover-detail.html'
        );
      }
    };
  }
})();
