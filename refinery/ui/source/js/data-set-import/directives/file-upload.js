'use strict';

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

angular
  .module('refineryDataSetImport')
  .directive('rpFileUpload', [
    '$window',
    'settings',
    rpFileUpload
  ]);
