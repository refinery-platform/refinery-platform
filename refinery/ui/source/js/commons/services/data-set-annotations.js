'use strict';

angular
  .module('refineryApp')
  .factory('dataSetAnnotationService', ['$resource', 'settings',
    function ($resource, settings) {
      var dataSetAnnotations = $resource(
        settings.appRoot + settings.refineryApi + '/data_sets/annotations/',
        {},
        {
          query: {
            method: 'GET',
            isArray: false
          }
        }
      );

      return dataSetAnnotations;
    }
  ]);
