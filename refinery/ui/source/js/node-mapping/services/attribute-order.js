'use strict';

function AttributeOrderFactory ($resource) {
  return $resource(
    '/api/v1/attributeorder/', {
      format: 'json',
      is_internal: 'false',
      is_exposed: 'true'
    }
  );
}

angular
  .module('refineryNodeMapping')
  .factory('AttributeOrder', ['$resource', AttributeOrderFactory]);
