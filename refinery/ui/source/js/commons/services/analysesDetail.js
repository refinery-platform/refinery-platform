'use strict';

// http.post header needed to be adjusted because django was not recognizing it
// as an ajax call.
angular
  .module('refineryApp')
  .factory('analysisDetailService', ['$resource', 'settings',
    function ($resource, settings) {
      var analysisDetail = $resource(
        settings.appRoot + '/analysis_manager/:uuid/?format=json',
        {
          uuid: '@uuid'
        },
        {
          query: {
            method: 'POST',
            headers: {
              'X-Requested-With': 'XMLHttpRequest'
            }
          }
        }
      );
      return analysisDetail;
    }
  ]);
