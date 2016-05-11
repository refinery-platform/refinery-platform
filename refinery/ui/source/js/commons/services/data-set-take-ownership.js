'use strict';

function DataSetTakeOwnershipFactory ($resource, settings) {
  return $resource(
    settings.appRoot + '/data_set_manager/import/take_ownership/'
  );
}

angular
  .module('refineryApp')
  .factory('dataSetTakeOwnershipService', [
    '$resource',
    'settings',
    DataSetTakeOwnershipFactory
  ]);
