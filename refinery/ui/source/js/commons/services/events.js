(function () {
  'use strict';
  angular
    .module('refineryApp')
    .factory('eventsService', eventsService);

  eventsService.$inject = ['$resource', 'settings'];

  function eventsService ($resource, settings) {
    var events = $resource(
      settings.appRoot + settings.refineryApiV2 + '/events/',
      {},
      {
        query: {
          method: 'GET',
          isArray: true
        }
      }
    );

    return events;
  }
})();
