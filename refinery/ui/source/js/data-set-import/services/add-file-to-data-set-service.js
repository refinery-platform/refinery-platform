/**
 * Addd file to data set Service
 * @namespace addFileToDataSetService
 * @desc Service which adds file to a data set after it has chunked uploaded
 * @memberOf refineryApp.refineryDataSetImport
 */
(function () {
  'use strict';
  angular
    .module('refineryDataSetImport')
    .factory('addFileToDataSetService', addFileToDataSetService);

  addFileToDataSetService.$inject = ['$resource', 'settings'];

  function addFileToDataSetService ($resource, settings) {
    var addFile = $resource(
      settings.appRoot + settings.refineryApiV2 + '/data_set_manager/add-files/',
      {
        format: 'json'
      },
      {
       /* update: Add file to data set node
            @params: data_set_uuid (req)
            type: string
       */
        update: {
          method: 'POST'
        }
      }
    );
    return addFile;
  }
})();
