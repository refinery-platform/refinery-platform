/**
 * Download Files Ctrl
 * @namespace DownloadFilesCtrl
 * @desc Controller responsible for providing a valid cURL command based
 * off of a User's currently filtered file selections in a FileBrowser.
 * @memberOf refineryApp
 */
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
    fetchAuthToken();

    function fetchAuthToken () {
      authTokenService.query().$promise.then(function (authToken) {
        vm.authToken = authToken.token;
      });
    }

    /**
     * @name downloadCsvCurl
     * @desc  VM method used to construct the cURL command that allows users
     * to download their files outside of Refinery
     * @memberOf DownloadFilesCtrl
    **/
    vm.downloadCsvCurl = function (downloadCsvQuery) {
      return 'curl ' +
        '\'' + $location.protocol() + '://' + $location.host() + ':' + $location.port() +
        '/files_download?' + downloadCsvQuery + '\'' +
        ' -H \"Authorization:  Token ' + vm.authToken +
        '\" | cut -f 1 -d \',\' | tail -n +2 | xargs -n 1 curl -O -L';
    };
  }
})();

