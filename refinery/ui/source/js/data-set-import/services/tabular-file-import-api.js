'use strict';

function TabularFileImportApiFactory (
  $resource, settings, dataSetImportSettings
) {
  return $resource(
    settings.appRoot +
    dataSetImportSettings.tabularFileImportUrl,
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
  .factory('tabularFileImportApi', [
    '$resource',
    'settings',
    'dataSetImportSettings',
    TabularFileImportApiFactory
  ]);
