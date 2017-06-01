(function () {
  'use strict';
  angular
  .module('refineryFileBrowser')
  .component('rpInputGroupsColumnTemplate', {
    templateUrl: ['$window', function ($window) {
      return $window.getStaticUrl(
        'partials/file-browser/partials/input-groups-column-template.html'
      );
    }]
  });
})();
