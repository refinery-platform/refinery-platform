angular
  .module('refineryApp')
  .constant('settings', {
    appRoot: document.location.protocol + '//' + document.location.host,
    authThrottling: 60000,
    debounceSearch: 250,
    publicGroupId: window.publicGroupId,
    refineryApi: '/api/v1',
    solrApi: '/solr',
    dashboard: {
      dataSetsSorting: [
        {
          djangoAttribute: 'creation_date',
          label: 'Creation date'
        },
        {
          djangoAttribute: 'file_count',
          label: 'Number of files'
        },
        {
          djangoAttribute: 'modification_date',
          label: 'Modification date'
        }
      ]
    }
  });
