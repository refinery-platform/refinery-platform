angular
  .module('refineryApp')
  .constant('settings', {
    appRoot: document.location.protocol + '//' + document.location.host,
    refineryApi: '/api/v1/',
    solrApi: '/solr/'
  });
