(function () {
  'use strict';
  angular
  .module('refineryFileBrowser')
  .component('rpUiGridRowTemplate', {
    templateUrl: ['$window', function ($window) {
      return $window.getStaticUrl(
        'partials/file-browser/partials/ui-grid-row-template.html'
      );
    }]
  });
})();
