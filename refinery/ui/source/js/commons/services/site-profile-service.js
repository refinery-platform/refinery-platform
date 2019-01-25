/**
 * Site Profile V2 Service
 * @namespace siteProfileV2Service
 * @desc Service to get and update site_profile fields via site_profile v2 api.
 * @memberOf refineryApp
 */
(function () {
  'use strict';
  angular
    .module('refineryApp')
    .factory('siteProfileService', siteProfileService);

  siteProfileService.$inject = ['$resource', 'settings'];

  function siteProfileService ($resource, settings) {
    var toolDefinitions = $resource(
      settings.appRoot + settings.refineryApiV2 + '/site_profile/',
      {},
      {
        query: {
          method: 'GET'
        },
        partial_update: {
          method: 'PATCH'
        }
      }
    );

    return toolDefinitions;
  }
})();
