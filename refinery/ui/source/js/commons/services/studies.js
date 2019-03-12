'use strict';

angular
  .module('refineryApp')
  .factory('studyService', ['$resource', 'settings',
    function ($resource, settings) {
      var study = $resource(
        settings.appRoot + settings.refineryApiV2 + '/studies/',
        {
          dataSetUuid: '@uuid'
        },
        {
          query: {
            method: 'GET',
            isArray: true
          }
        }
      );

      return study;
    }
  ]);
