'use strict';

angular
  .module('refineryDataSetImport')
  .constant('dataSetImportSettings', {
    isaTabImportUrl: '/data_set_manager/import/isa-tab-form/',
    uploadUrl: '/data_set_manager/import/chunked-upload/',
    uploadCompleteUrl: '/data_set_manager/import/chunked-upload-complete/',
    chunkSize: 10 * 1024 * 1024  // 10 MB
  });
