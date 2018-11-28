(function () {
  'use strict';

  angular
  .module('refineryApp')
  .controller('DownloadFilesCtrl', DownloadFilesCtrl);

  DownloadFilesCtrl.$inject = [
    '$httpParamSerializer',
    '$location',
    '$log',
    '$q',
    '$scope',
    '$window',
    '_',
    'authTokenService'
  ];

  function DownloadFilesCtrl (
      $httpParamSerializer,
      $location,
      $log,
      $q,
      $scope,
      $window,
      _,
      authTokenService
  ) {
    var vm = this;
    authTokenService.query().$promise.then(function (authToken) {
      vm.authToken = authToken.token;
    });

    vm.downloadCsvUrl = function () {
      return '\'' + $location.protocol() + '://' + $location.host() + ':' + $location.port() + vm.downloadCsvPath + '\'';
    };

    vm.downloadCsvCurl = function (downloadCsvQuery) {
      vm.downloadCsvPath = '/files_download?' + downloadCsvQuery;
      return 'curl ' + vm.downloadCsvUrl() + ' -H \"Authorization:' +
        '  Token ' + vm.authToken + '\" | cut -f 1 -d \',\' | tail -n +2 | xargs -n 1 curl -O -L';
    };
  }
})();

