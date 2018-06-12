/**
 * Data file dropdown Component
 * @namespace rpDataFileDropdown
 * @desc Component for the download column in the file browser.
 * @memberOf refineryApp.refineryFileBrowser
 */
(function () {
  'use strict';
  angular
    .module('refineryFileBrowser')
    .component('rpDataFileDropdown', {
      bindings: {
        fileStatus: '=',
        nodeObj: '='
      },
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl('partials/file-browser/partials/data-file-dropdown.html');
      }],
      controller: 'DataFileDropdownCtrl'
    });
})();
