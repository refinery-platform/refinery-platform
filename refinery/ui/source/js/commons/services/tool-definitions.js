(function () {
  'use strict';
  angular
    .module('refineryApp')
    .factory('toolDefinitionsService', toolDefinitionsService);

  toolDefinitionsService.$inject = ['$resource', 'settings'];

  function toolDefinitionsService ($resource, settings) {
    var toolDefinitions = $resource(
      settings.appRoot + settings.refineryApiV2 + '/tool_definitions/',
      {},
      {
        query: {
          method: 'GET',
          isArray: true,
          params: { dataSetUuid: '' }
        }
      }
    );

    return toolDefinitions;
  }
})();
