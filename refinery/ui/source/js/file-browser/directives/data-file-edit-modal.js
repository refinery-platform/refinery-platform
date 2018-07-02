/**
 * Data File Edit Modal
 * @namespace rpDataFileEditModal
 * @desc Add or remove a data file associated with a node
 * @memberOf refineryApp.fileBrowser
 */
(function () {
  'use strict';
  angular
    .module('refineryFileBrowser')
    .component('rpDataFileEditModal', {
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl('partials/file-browser/partials/data-file-edit-modal.html');
      }],
      bindings: {
        modalInstance: '<',
        resolve: '<'
      },
      controller: 'DataFileEditModalCtrl'
    });
})();
