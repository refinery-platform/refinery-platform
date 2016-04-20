'use strict';

function rpAssayFilesUtilModalDetail () {
  return {
    restrict: 'AE',
    templateUrl: '/static/partials/file-browser/partials/assay-files-util-modal-detail.html'
  };
}

angular
  .module('refineryFileBrowser')
  .directive(
  'rpAssayFilesUtilModalDetail',
  [
    rpAssayFilesUtilModalDetail
  ]
  );
