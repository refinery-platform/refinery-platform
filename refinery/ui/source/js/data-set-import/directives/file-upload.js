(function () {
  'use strict';

  angular
    .module('refineryDataSetImport')
    .directive('rpFileUpload', rpFileUpload);

  rpFileUpload.$inject = ['$window', 'settings'];

  function rpFileUpload ($window, settings) {
    return {
      restrict: 'E',
      templateUrl: function () {
        if (settings.djangoApp.deploymentPlatform === 'aws') {
          return $window.getStaticUrl('partials/data-set-import/partials/file-upload-s3.html');
        }
        return $window.getStaticUrl('partials/data-set-import/partials/file-upload.html');
      }
    };
  }
})();
