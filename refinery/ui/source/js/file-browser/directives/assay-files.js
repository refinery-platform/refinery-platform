'use strict';

function rpFileBrowserAssayFiles () {
  return {
    restrict: 'E',
    templateUrl: '/static/partials/file-browser/partials/assay-files.html',
  };
}

angular
  .module('refineryFileBrowser')
  .directive('rpFileBrowserAssayFiles', [
    rpFileBrowserAssayFiles
  ]
);
