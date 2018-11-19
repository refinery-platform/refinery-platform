(function () {
  'use strict';

  angular
  .module('refineryApp')
  .controller('DownloadFilesModalCtrl', DownloadFilesModalCtrl);

  DownloadFilesModalCtrl.$inject = [
    '$window',
    '$httpParamSerializer',
    '$location',
    '$log',
    '$q',
    '$scope',
    '_',
    'authTokenService',
    'selectedFilterService',
    'userFileFiltersService',
    'userFileParamsService',
  ];

  function DownloadFilesModalCtrl (
      $window,
      $httpParamSerializer,
      $location,
      $log,
      $q,
      $scope,
      _,
      authTokenService,
      selectedFilterService,
      userFileFiltersService,
      userFileParamsService
  ) {
    var vm = this;
    authTokenService.query().$promise.then(function (authToken) {
      vm.authToken = authToken.token;
    });
    vm.usesFileBrowser = Boolean($window.externalAssayUuid);
    vm.filterParams = {};

    vm.downloadCsvQuery = function () {
      if (vm.usesFileBrowser) {
        vm.filterParams = {
          filter_attribute: selectedFilterService.attributeSelectedFields,
          assay_uuid: $window.externalAssayUuid,
          limit: 100000000
        };
      } else {
        vm.filterParams = {
          filter_attribute: userFileFiltersService,
          sort: userFileParamsService.sort(),
          limit: 100000000
        };
      }
      return $httpParamSerializer(vm.filterParams);
    };
    vm.downloadCsvPath = function () {
      return '/files_download?' + vm.downloadCsvQuery();
    };
    vm.downloadCsvUrl = function () {
      return $location.protocol() + '://'
        + $location.host() + ':' + $location.port()
        + vm.downloadCsvPath();
    };
    vm.downloadCsvCurl = function () {
      return vm.downloadCsvUrl() + '\' -H "Authorization: Token ' + vm.authToken + '"';
    };
  }
})();

