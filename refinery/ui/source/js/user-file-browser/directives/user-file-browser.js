(function () {
  'use strict';
  angular
    .module('refineryUserFileBrowser')
    .component('rpUserFileBrowser', {
      controller: 'UserFileBrowserCtrl',
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl('partials/user-file-browser/views/user-file-browser.html');
      }]
    });
})();
