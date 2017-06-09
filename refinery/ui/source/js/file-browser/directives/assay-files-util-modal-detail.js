(function () {
  'use strict';

  angular
    .module('refineryFileBrowser')
    .directive('rpAssayFilesUtilModalDetail', rpAssayFilesUtilModalDetail);

  rpAssayFilesUtilModalDetail.$inject = ['$window'];

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
})();
