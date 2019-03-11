'use strict';

angular
  .module('refineryApp')
  .constant('settings', {
    appRoot: '',
    authThrottling: 60000,
    djangoApp: window.djangoApp || {},
    neo4jApi: '/neo4j',
    refineryApi: '/api/v1',
    refineryApiV2: '/api/v2',
    solrApi: '/solr'
  });
