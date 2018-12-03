(function () {
  'use strict';
  angular
    .module('refineryApp')
    .component('rpDownloadCsvButton', {
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl(
            'partials/commons/partials/download-csv-button.html'
        );
      }],
      bindings: {
        modalInstance: '<',
        resolve: '<',
        downloadCsv: '<',
        totalFiles: '<'
      },
    });
})();
