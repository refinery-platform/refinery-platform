'use strict';

angular
  .module('refineryApp')
  .factory('userFileService', ['$resource', 'settings',
    function ($resource, settings) {
      return $resource(
        settings.appRoot + settings.refineryApiV2 + '/user/files/',
        {},
        {
          query: {
            method: 'GET'
          }
        }
      );
    }
  ]);
