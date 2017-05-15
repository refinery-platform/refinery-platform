'use strict';

function rpFileBrowserAssayFiles ($window) {
  return {
    restrict: 'E',
    templateUrl: function () {
      return $window.getStaticUrl('partials/file-browser/partials/assay-files.html');
    }
  };
}

angular
  .module('refineryFileBrowser')
  .directive('rpFileBrowserAssayFiles', [
    '$window',
    rpFileBrowserAssayFiles
  ]
);
