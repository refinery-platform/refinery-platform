angular
  .module('refineryFileBrowser')
  .directive(
    'rpAssayFilesUtilModalDetail',
    [
      rpAssayFilesUtilModalDetail
    ]
  );

function rpAssayFilesUtilModalDetail( ) {
  "use strict";
    return {
    restrict: 'AE',
    templateUrl: '/static/partials/file-browser/partials/assay-files-util-modal-detail.html'
    };
}
