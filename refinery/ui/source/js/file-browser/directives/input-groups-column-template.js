(function () {
  'use strict';
  angular
  .module('refineryFileBrowser')
  .directive('rpInputGroupsColumnTemplate', rpInputGroupsColumnTemplate);

  rpInputGroupsColumnTemplate.$inject = ['$window'];

  function rpInputGroupsColumnTemplate ($window) {
    return {
      restrict: 'E',
      templateUrl: function () {
        return $window.getStaticUrl(
          'partials/file-browser/partials/input-groups-column-template.html'
        );
      }
    };
  }
})();
