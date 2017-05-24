'use strict';

function rpFileUpload ($window) {
  return {
    restrict: 'E',
    templateUrl: function () {
      // TODO: uncomment this once data file upload to S3 is fully implemented
      // if (settings.djangoApp.deploymentPlatform === 'aws') {
      //   return $window.getStaticUrl('partials/data-set-import/partials/file-upload-s3.html');
      // }
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
