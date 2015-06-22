angular
  .module('refineryApp')
  .constant('settings', {
    appRoot: document.location.protocol + '//' + document.location.host,
    authThrottling: 60000,
    debounceSearch: 250,
    refineryApi: '/api/v1',
    solrApi: '/solr'
  });
