'use strict';

angular
  .module('refineryApp')
  .factory('assayService', ['$resource', 'settings',
    function ($resource, settings) {
      var assays = $resource(
        settings.appRoot + settings.refineryApi + '/data_sets/:uuid/assays/',
        {
          uuid: '@uuid'
        },
        {
          query: {
            method: 'GET',
            isArray: false
          }
        }
      );

      return assays;
    }
  ]);
