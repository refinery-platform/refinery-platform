'use strict';

function GroupFactory ($resource, settings) {
  return $resource(
    settings.appRoot + settings.refineryApi + '/groups/:uuid/',
    {
      uuid: '@uuid',
      format: 'json'
    },
    {
      query: {
        method: 'GET',
        isArray: false
      }
    }
  );
}

angular
  .module('refineryApp')
  .factory('groupService', ['$resource', 'settings', GroupFactory]);
