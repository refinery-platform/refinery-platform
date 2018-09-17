(function () {
  'use strict';
  angular
    .module('refineryApp')
    .factory('toolsService', toolsService);

  toolsService.$inject = ['$resource', 'settings'];

  function toolsService ($resource, settings) {
    var tools = $resource(
      settings.appRoot + settings.refineryApiV2 + '/tools/',
      {},
      {
       /* save: Create a new node group:
            @params: tool_definition_uuid (req)
            type: string
            @params: file_relationships (req)
            type: string, json obj
       */
        save: {
          method: 'POST',
          isArray: false
        }
      }
    );
    return tools;
  }
})();
