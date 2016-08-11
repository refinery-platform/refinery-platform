'use strict';

function rpFileUpload () {
  return {
    restrict: 'E',
    replace: true,
    templateUrl:
      '/static/partials/data-set-import/partials/file-upload.html'
  };
}

angular
  .module('refineryDataSetImport')
  .directive('rpFileUpload', [
    rpFileUpload
  ]);
