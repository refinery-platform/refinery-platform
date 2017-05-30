(function () {
  'use strict';
  angular
    .module('refineryUserFileBrowser')
    .component('rpUserFileBrowserFiles', {
      controller: 'UserFileBrowserCtrl',
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl('partials/user-file-browser/partials/files.html');
      }]
    });
})();
