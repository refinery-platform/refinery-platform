/**
 * User Perms Icon Component
 * @namespace rpUserPermsIcon
 * @desc Component which displays a data set's permissions by users
 * @memberOf refineryApp.refineryToolLaunch
 */
(function () {
  'use strict';
  angular
    .module('refineryFileBrowser')
    .component('rpUserPermsIcon', {
      controller: 'UserPermsIconCtrl',
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl('partials/file-browser/partials/user-perms-icon.html');
      }]
    });
})();
