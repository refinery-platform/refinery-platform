'use strict';

function rpIsAssayFilesLoading (filesLoadingService) {
  return {
    restrict: 'E',
    templateUrl: '/static/partials/file-browser/partials/is-assay-files-loading.html',
    link: function (scope) {
      scope.isAssayFilesLoading = filesLoadingService.isAssayFilesLoading;
    }
  };
}

angular
  .module('refineryFileBrowser')
  .directive('rpIsAssayFilesLoading', ['filesLoadingService', rpIsAssayFilesLoading]
);
