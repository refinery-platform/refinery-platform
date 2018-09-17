(function () {
  'use strict';

  angular
    .module('refineryFileBrowser')
    .directive('rpFileBrowserAssayFiles', rpFileBrowserAssayFiles);

  rpFileBrowserAssayFiles.$inject = ['$window'];

  function rpFileBrowserAssayFiles ($window) {
    return {
      restrict: 'E',
      templateUrl: function () {
        return $window.getStaticUrl('partials/file-browser/partials/assay-files.html');
      }
    };
  }
})();
