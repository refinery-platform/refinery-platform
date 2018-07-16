/**
 * Import Confirmation Modal Component
 * @namespace rpImportConfirmationModal
 * @desc Component to aid with rendering of the Metadata revision
 * confirmation modal.
 * @memberOf refineryApp.refineryDataSetImport
 */
(function () {
  'use strict';
  angular
    .module('refineryDataSetImport')
    .component('rpImportConfirmationModal', {
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl(
          'partials/data-set-import/partials/import-confirmation-modal.html'
        );
      }],
      bindings: {
        modalInstance: '<',
        resolve: '<'
      },
      controller: 'ImportConfirmationModalCtrl'
    });
})();
