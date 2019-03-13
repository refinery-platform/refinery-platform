/**
 * Studies V2 Service
 * @namespace studyService
 * @desc Service to retrieve studies. Note, current API requires a
 * dataSetUuid and returns the related studies.
 * @memberOf refineryApp
 */
(function () {
  'use strict';

  angular
    .module('refineryApp')
    .factory('studyService', studyService);

  studyService.$inject = ['$resource', 'settings'];

  function studyService ($resource, settings) {
    var study = $resource(
      settings.appRoot + settings.refineryApiV2 + '/studies/',
      {},
      {
        query: {
          method: 'GET',
          isArray: true
        }
      }
    );
    return study;
  }
})();
