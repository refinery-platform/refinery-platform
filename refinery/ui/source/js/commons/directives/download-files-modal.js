(function () {
  'use strict';
  angular
    .module('refineryApp')
    .component('rpDownloadFilesModal', {
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl(
            'partials/commons/partials/download-files-modal.html'
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
