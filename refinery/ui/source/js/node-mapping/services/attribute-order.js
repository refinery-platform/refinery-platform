angular
  .module('refineryNodeMapping')
  .factory("AttributeOrder", function($resource) {
    'use strict';

    return $resource(
      '/api/v1/attributeorder/', {
        format: 'json',
        is_internal: 'false',
        is_exposed: 'true',
      }
    );
  });
