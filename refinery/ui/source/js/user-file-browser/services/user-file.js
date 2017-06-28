(function () {
  'use strict';
  angular
    .module('refineryApp')
    .factory('userFileService', userFileService);

  userFileService.$inject = ['$resource', 'settings'];

  function userFileService ($resource, settings) {
    var userFile = $resource(
      settings.appRoot + settings.refineryApiV2 + '/user/files/',
      {},
      {
        query: {
          method: 'GET',
          params: {
            fq: '(technology_Characteristics_generic_s:ChIP-seq OR '
               + 'technology_FOOO_generic_s%3AChIP-seq)'
          }
        }

      }
    );
    return userFile;
  }
})();
