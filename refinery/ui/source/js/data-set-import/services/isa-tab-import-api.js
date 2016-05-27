'use strict';

function IsaTabImportApiFactory (
  $resource, settings, dataSetImportSettings
) {
  return $resource(
    settings.appRoot +
    dataSetImportSettings.isaTabImportUrl,
    {},
    {
      create: {
        method: 'POST',
        transformRequest: angular.identity,
        headers: {
          'Content-Type': undefined,
          'X-Requested-With': 'XMLHttpRequest'
        }
      }
    }
  );
}

angular
  .module('refineryDataSetImport')
  .factory('isaTabImportApi', [
    '$resource',
    'settings',
    'dataSetImportSettings',
    IsaTabImportApiFactory
  ]);
