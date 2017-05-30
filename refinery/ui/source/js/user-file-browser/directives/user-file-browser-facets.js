(function () {
  'use strict';
  angular
    .module('refineryUserFileBrowser')
    .component('rpUserFileBrowserFacets', {
      controller: 'UserFileBrowserCtrl',
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl(
            'partials/user-file-browser/partials/user-file-browser-facets.html'
        );
      }]
    });
})();
