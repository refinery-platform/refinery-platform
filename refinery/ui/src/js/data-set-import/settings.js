angular
  .module('refineryDataSetImport')
  .constant('dataSetImportSettings', {
    uploadUrl: "/data_set_manager/import/chunked-upload/",
    uploadCompleteUrl: "/data_set_manager/import/chunked-upload-complete/",
    chunkSize: 10 * 1000 * 1000  // bytes
  });
