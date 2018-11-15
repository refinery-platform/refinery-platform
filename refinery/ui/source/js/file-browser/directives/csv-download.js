(function () {
  'use strict';
  angular
    .module('refineryFileBrowser')
    .component('rpFileBrowserCsvDownload', {
      controller: 'FileBrowserCtrl',
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl('partials/file-browser/partials/csv-download.html');
      }]
    });
})();
