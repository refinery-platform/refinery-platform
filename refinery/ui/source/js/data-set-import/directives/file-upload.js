'use strict';

function rpFileUpload ($window) {
  return {
    restrict: 'E',
    templateUrl: function () {
      return $window.getStaticUrl('partials/data-set-import/partials/file-upload.html');
    }
  };
}

angular
  .module('refineryDataSetImport')
  .directive('rpFileUpload', [
    '$window',
    rpFileUpload
  ]);
