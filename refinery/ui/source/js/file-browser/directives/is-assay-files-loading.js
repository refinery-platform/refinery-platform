'use strict';

function rpIsAssayFilesLoading ($window, filesLoadingService) {
  return {
    restrict: 'E',
    templateUrl: function () {
      return $window.getStaticUrl('partials/file-browser/partials/is-assay-files-loading.html');
    },
    link: function (scope) {
      scope.$watch(
        function () {
          return filesLoadingService.isAssayFilesLoading;
        },
        function () {
          scope.isAssayFilesLoading = filesLoadingService.isAssayFilesLoading;
        }
      );
    }
  };
}

angular
  .module('refineryFileBrowser')
  .directive('rpIsAssayFilesLoading', ['$window', 'filesLoadingService', rpIsAssayFilesLoading]
);
