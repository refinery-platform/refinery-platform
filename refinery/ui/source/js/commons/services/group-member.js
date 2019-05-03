'use strict';

angular
  .module('refineryApp')
  .factory('groupMemberService', ['$resource', 'settings',
    function ($resource, settings) {
      return $resource(
        settings.appRoot + settings.refineryApiV2 + '/groups/:uuid/members/',
        {
          uuid: '@uuid',
          id: '@id',
          format: 'json'
        },
        {
          update: {
            method: 'POST'
          }
        }
      );
    }]);
