/**
 * File Upload Command Line Modal
 * @namespace rpFileUploadCommandLineModal
 * @desc Component for modal which displays command to upload files
 * @memberOf refineryApp.refineryDataSetImport
 */
(function () {
  'use strict';
  angular
    .module('refineryDataSetImport')
    .component('rpFileUploadCommandLineModal', {
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl(
            'partials/data-set-import/partials/file-upload-command-line-modal.html'
        );
      }],
      bindings: {
        modalInstance: '<'
      },
      controller: 'FileUploadCommandLineModalCtrl'
    });
})();
