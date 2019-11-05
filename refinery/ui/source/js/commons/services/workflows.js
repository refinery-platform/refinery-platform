(function () {
  'use strict';
  angular
    .module('refineryApp')
    .factory('workflowService', workflowService);

  workflowService.$inject = ['$resource', 'settings'];

  function workflowService ($resource, settings) {
    var workflows = $resource(
      settings.appRoot + settings.refineryApiV2 + '/workflows/',
      {},
      {
       /* retrieve: Get the workflow:
            @params: uuid (req)
            type: string
       */
        save: {
          method: 'GET',
          isArray: false
        }
      }
    );
    return workflows;
  }
})();
