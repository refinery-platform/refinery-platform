'use strict';

function rpAssayFilesUtilModalDetail ($window) {
  return {
    restrict: 'AE',
    templateUrl: function () {
      return $window.getStaticUrl(
        'partials/file-browser/partials/assay-files-util-modal-detail.html'
      );
    }
  };
}

angular
  .module('refineryFileBrowser')
  .directive('rpAssayFilesUtilModalDetail', [
    '$window',
    rpAssayFilesUtilModalDetail
  ]);
