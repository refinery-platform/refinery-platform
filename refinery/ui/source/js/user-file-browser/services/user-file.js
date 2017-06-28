(function () {
  'use strict';
  angular
    .module('refineryApp')
    .factory('userFileService', userFileService);

  // TODO: userFileBrowserFiltersCtrl.filters is what I need, but maybe I need a new service?
  userFileService.$inject = ['$resource', 'settings', 'userFileFiltersService'];

  function userFileService ($resource, settings, userFileFiltersService) {
    var userFile = $resource(
      settings.appRoot + settings.refineryApiV2 + '/user/files/',
      {},
      {
        query: {
          method: 'GET',
          params: {
            fq: function () {
              // TODO: Get the data the right way, and use it to construct the solr query
              console.log(userFileFiltersService);
              return '(technology_Characteristics_generic_s:ChIP-seq OR '
                     + 'technology_FOOO_generic_s:ChIP-seq)';
            }
          }
        }
      }
    );
    return userFile;
  }
})();
