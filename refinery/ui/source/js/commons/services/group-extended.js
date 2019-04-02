'use strict';

angular
  .module('refineryApp')
  .factory('groupExtendedService', ['$resource', 'settings',
    function ($resource, settings) {
      return $resource(
        settings.appRoot + settings.refineryApi + '/extended_groups/:uuid/',
        {
          uuid: '@uuid'
        },
        {
          create: {
            method: 'POST'
          }
        }
      );
    }]);
