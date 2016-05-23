'use strict';

angular
  .module('refineryApp')
  .factory('studyService', ['$resource', 'settings',
    function ($resource, settings) {
      var study = $resource(
        settings.appRoot + settings.refineryApi + '/data_sets/:uuid/studies/',
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

      return study;
    }
  ]);
