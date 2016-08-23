'use strict';

function DataSetImportStates (
  refineryStateProvider,
  refineryUrlRouterProvider
) {
  refineryStateProvider
    .state(
      'import', {
        url: '/',
        reloadOnSearch: false,
        templateUrl: '/static/partials/data-set-import/views/import.html',
      },
      '/data_set_manager/import/'
    )
    .state(
      'isaTabImport', {
        url: '/isa-tab-import',
        reloadOnSearch: false,
        templateUrl: '/static/partials/data-set-import/views/isa-tab-import.html',
      },
      '/data_set_manager/import/'
    );

  refineryUrlRouterProvider.otherwise(
    '/',
    '/data_set_manager/import/'
  );
}

angular
  .module('refineryDataSetImport')
  .config([
    'refineryStateProvider',
    'refineryUrlRouterProvider',
    DataSetImportStates
  ]
);
