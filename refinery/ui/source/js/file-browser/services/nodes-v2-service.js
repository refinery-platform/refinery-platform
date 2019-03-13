(function () {
  'use strict';
  angular
    .module('refineryFileBrowser')
    .factory('nodesV2Service', nodesV2Service);

  nodesV2Service.$inject = ['$resource', 'settings'];

  function nodesV2Service ($resource, settings) {
    var node = $resource(
      settings.appRoot + settings.refineryApiV2 + '/nodes/:uuid/',
      {
        uuid: '@uuid',
        format: 'json'
      },
      {
        partial_update: {
          method: 'PATCH'
        }
      }
    );
    return node;
  }
})();
