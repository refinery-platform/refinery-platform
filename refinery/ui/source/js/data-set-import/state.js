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
        controller: 'RefineryImportCtrl as import'
      },
      '/data_set_manager/import/'
    )
    .state(
      'fileUpload', {
        url: '/upload/',
        reloadOnSearch: false,
        templateUrl: '/static/partials/data-set-import/views/file-upload.html',
        controller: 'RefineryFileUploadCtrl as fileUpload'
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
