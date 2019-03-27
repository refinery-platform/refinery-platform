(function () {
  'use strict';
  angular
    .module('refineryDataSetImport')
    .component('rpFileUploadCommandLineButton', {
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl(
            'partials/data-set-import/partials/file-upload-command-line-button.html'
        );
      }],
      bindings: {
        modalInstance: '<'
      },
      controller: 'FileUploadCommandLineButtonCtrl'
    });
})();
