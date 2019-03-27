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
