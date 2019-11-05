(function () {
  'use strict';
  angular
    .module('refineryApp')
    .factory('workflowService', workflowService);

  workflowService.$inject = ['$resource', 'settings'];

  function workflowService ($resource, settings) {
    var workflows = $resource(
      settings.appRoot + settings.refineryApiV2 + '/workflows/:uuid/',
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
    return workflows;
  }
})();
