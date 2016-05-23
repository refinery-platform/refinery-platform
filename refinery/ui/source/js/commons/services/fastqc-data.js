'use strict';

function FastQCDataService ($resource, settings) {
  return $resource(
    settings.appRoot + settings.refineryApi + '/fastqc/:uuid/',
    {
      uuid: '@uuid'
    }
  );
}

angular
  .module('refineryApp')
  .factory('fastqcDataService', ['$resource', 'settings', FastQCDataService]);
