'use strict';

function fileSources ($http) {
  return {
    check: function (fileData, successCallback, errorCallback) {
      var req = {
        method: 'POST',
        url: '/data_set_manager/import/check_files/',
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        },
        data: fileData
      };
      $http(req).success(successCallback).error(errorCallback);
    }
  };
}

angular
  .module('refineryMetadataTableImport')
  .factory('fileSources', ['$http', fileSources]);
