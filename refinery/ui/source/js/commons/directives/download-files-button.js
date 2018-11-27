(function () {
  'use strict';
  angular
    .module('refineryApp')
    .component('rpDownloadFilesButton', {
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl(
            'partials/commons/partials/download-files-button.html'
        );
      }],
      bindings: {
        modalInstance: '<',
        resolve: '<',
        downloadCsvQuery: '<'
      },
      controller: 'DownloadFilesCtrl'
    });
})();
