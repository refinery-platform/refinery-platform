(function () {
  'use strict';
  angular
    .module('refineryApp')
    .factory('urlService', urlService);

  urlService.$inject = ['settings'];

  function urlService (settings) {
    var url = {
      static: function (relativePath) {
        return settings.djangoApp.staticUrl + relativePath;
      }
      // TODO: add methods to generate URLs for API, Neo4j, Solr, etc
    };
    return url;
  }
})();
