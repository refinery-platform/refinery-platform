'use strict';

angular
  .module('refineryApp')
  .factory('fileStoreItemService', ['$resource', 'settings',
    function ($resource, settings) {
      var fileStoreItem = $resource(
        settings.appRoot + settings.refineryApiV2 + '/file_store_items/:uuid/',
        {
          uuid: '@uuid'
        },
        {
          query: {
            method: 'GET'
          }
        }
      );

      return fileStoreItem;
    }
  ]);
