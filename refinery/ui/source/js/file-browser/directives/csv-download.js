(function () {
  'use strict';

  angular
    .module('refineryFileBrowser')
    .directive('rpFileBrowserCsvDownload', rpFileBrowserCsvDownload);

  rpFileBrowserCsvDownload.$inject = ['$window'];

  function rpFileBrowserCsvDownload ($window) {
    return {
      restrict: 'E',
      templateUrl: function () {
        return $window.getStaticUrl('partials/file-browser/partials/csv-download.html');
      }
    };
  }
})();
