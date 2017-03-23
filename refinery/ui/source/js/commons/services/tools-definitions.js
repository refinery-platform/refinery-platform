(function () {
  'use strict';
  angular
    .module('refineryApp')
    .factory('toolsDefinitionsService', toolsDefinitionsService);

  toolsDefinitionsService.$inject = ['$resource', 'settings'];

  function toolsDefinitionsService ($resource, settings) {
    var toolsDefinitions = $resource(
      settings.appRoot + settings.refineryApiV2 + '/tools/definitions',
      {},
      {
        query: {
          method: 'GET',
          isArray: true
        }
      }
    );

    return toolsDefinitions;
  }
})();
