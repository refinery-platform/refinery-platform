'use strict';

function rpFileUpload () {
  return {
    restrict: 'E',
    templateUrl:
      '/static/partials/data-set-import/partials/file-upload.html'
  };
}

angular
  .module('refineryDataSetImport')
  .directive('rpFileUpload', [
    rpFileUpload
  ]);
