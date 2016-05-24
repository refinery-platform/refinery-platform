'use strict';

angular
  .module('refineryApp')
  .factory('pubmedService', ['$q', '$http', '$resource', 'settings',
    function ($q, $http, $resource, settings) {
      /*
       * Search
       */
      var search = $resource(
        settings.appRoot + '/pubmed/search/:term/',
        {
          term: '@term'
        }
      );

      /*
       * Fecth full article
       */
      var abstract = $resource(
        settings.appRoot + '/pubmed/abstract/:id/',
        {
          id: '@id'
        }
      );

      /*
       * Fetch basic meta data and summary
       */
      var summary = $resource(
        settings.appRoot + '/pubmed/summary/:id/',
        {
          id: '@id'
        }
      );

      function get (resource, queryTerms) {
        if (resource === 'abstract') {
          return abstract.get(queryTerms).$promise;
        }

        if (resource === 'search') {
          return search.get(queryTerms).$promise;
        }

        if (resource === 'summary') {
          return summary.get(queryTerms).$promise;
        }

        return $q.reject('Resource "' + resource + '" not found.');
      }

      return {
        get: get
      };
    }
  ]);
