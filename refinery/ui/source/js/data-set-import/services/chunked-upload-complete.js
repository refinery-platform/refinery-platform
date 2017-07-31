'use strict';

function ChunkedUploadFactory (
  $resource, $httpParamSerializerJQLike, settings, dataSetImportSettings
) {
  return $resource(
    settings.appRoot +
    dataSetImportSettings.uploadCompleteUrl,
    {},
    {
      save: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        transformRequest: function (data) {
          return $httpParamSerializerJQLike(data);
        }
      },
      remove: {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        transformRequest: function (data) {
          return $httpParamSerializerJQLike(data);
        }
      }
    }
  );
}

angular
  .module('refineryDataSetImport')
  .factory('chunkedUploadService', [
    '$resource',
    '$httpParamSerializerJQLike',
    'settings',
    'dataSetImportSettings',
    ChunkedUploadFactory
  ]);
