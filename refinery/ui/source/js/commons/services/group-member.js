'use strict';

angular
  .module('refineryApp')
  .factory('groupMemberService', ['$resource', 'settings',
    function ($resource, settings) {
      return $resource(
        settings.appRoot + settings.refineryApiV2 + '/groups/:uuid/members/:id/',
        {
          uuid: '@uuid',
          id: '@id',
          format: 'json'
        },
        {
          remove: {
            method: 'DELETE'
          },
          add: {
            method: 'POST'
          }
        }
      );
    }]);
