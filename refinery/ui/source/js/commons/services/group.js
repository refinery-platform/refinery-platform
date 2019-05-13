/**
 * Group V2 Service
 * @namespace groupV2Service
 * @desc Service to query groups API with a data set uuid
 * @memberOf refineryApp
 */
(function () {
  'use strict';

  angular
    .module('refineryApp')
    .factory('groupService', groupService);

  groupService.$inject = ['$resource', 'settings'];

  function groupService ($resource, settings) {
    var groups = $resource(
      settings.appRoot + settings.refineryApiV2 + '/groups/:uuid/',
      {
        uuid: '@uuid'
      },
      {
        query: {
          method: 'GET',
          isArray: true,
        },
        partial_update: {
          method: 'PATCH'
        }
      }
    );

    return groups;
  }
})();
