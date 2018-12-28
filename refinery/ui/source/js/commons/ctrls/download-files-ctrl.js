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

        // construct URL for csv file download including any filter params
        '/files_download?' + downloadCsvQuery + '\'' +

        // add Authorization header so that users can access protected
        // `/files_download` endpoint from outside out Refinery
        ' -H \"Authorization:  Token ' + vm.authToken + '\" |' +

        // exclude csv column headers
        ' tail -n +2 |' +

        // get the first column (file url) from each row the .csv file returned
        ' cut -f 1 -d \',\' |' +

        // exclude files from the download that aren't available or pending
        ' grep -v \'N/A\' | grep -v \'PENDING\' |' +

        // download each file with cURL again
        ' xargs -n 1 curl -O -L';
    };
  }
})();

