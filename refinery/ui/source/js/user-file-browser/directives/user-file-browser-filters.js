(function () {
  'use strict';
  angular
    .module('refineryUserFileBrowser')
    .component('rpUserFileBrowserFilters', {
      controller: 'UserFileBrowserCtrl',
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl(
            'partials/user-file-browser/partials/user-file-browser-filters.html'
        );
      }]
    });
})();
