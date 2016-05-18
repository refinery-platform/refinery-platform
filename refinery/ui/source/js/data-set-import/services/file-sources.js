'use strict';

function fileSources ($resource, settings) {
  return $resource(
    settings.appRoot +
    '/data_set_manager/import/check_files/',
    {},
    {
      check: {
        method: 'POST',
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      }
    }
  );
}

angular
  .module('refineryDataSetImport')
  .factory('fileSources', ['$resource', 'settings', fileSources]);
