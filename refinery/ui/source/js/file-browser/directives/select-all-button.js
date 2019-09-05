/**
 * Select All Button
 * @namespace rpSelectAllButton
 * @desc Component which displays a select All button
 * @memberOf refineryApp.refineryFileBrowser
 */
(function () {
  'use strict';
  angular
    .module('refineryFileBrowser')
    .component('rpSelectAllButton', {
      controller: 'SelectAllButtonCtrl',
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl('partials/file-browser/partials/select-all-button.html');
      }]
    });
})();
