'use strict';

function IsaTabImportFormFactory (
  $resource, settings, dataSetImportSettings
) {
  return $resource(
    settings.appRoot +
    dataSetImportSettings.isaTabImportUrl
  );
}

angular
  .module('refineryDataSetImport')
  .factory('isaTabImportFormService', [
    '$resource',
    'settings',
    'dataSetImportSettings',
    IsaTabImportFormFactory
  ]);
