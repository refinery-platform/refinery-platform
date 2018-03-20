'use strict';

angular
  .module('refineryApp')
  .factory('analysisDetailService', ['$resource', 'settings',
    function ($resource, settings) {
      var analysisDetail = $resource(
        settings.appRoot + '/analysis_manager/:uuid/',
        {
          uuid: '@uuid'
        },
        {
          query: {
            method: 'GET'
          }
        }
      );
      return analysisDetail;
    }
  ]);
