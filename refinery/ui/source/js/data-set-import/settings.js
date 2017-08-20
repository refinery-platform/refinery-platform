(function () {
  'use strict';

  angular
    .module('refineryDataSetImport')
    .constant('dataSetImportSettings', {
      checkFilesUrl: '/data_set_manager/import/check_files/',
      isaTabImportUrl: '/data_set_manager/import/isa-tab-form/',
      tabularFileImportUrl: '/data_set_manager/import/metadata-table-form/',
      uploadUrl: '/data_set_manager/import/chunked-upload/',
      uploadCompleteUrl: '/data_set_manager/import/chunked-upload-complete/',
      chunkSize: 50 * 1024 * 1024,  // bytes
      queueSize: 2,
      ACL: 'bucket-owner-full-control'
    });
})();
