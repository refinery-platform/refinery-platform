'use strict';

angular
  .module('refineryDataSetImport')
  .config([
    '$httpProvider', 'fileUploadProvider', 'dataSetImportSettings',
    function ($httpProvider, fileUploadProvider, dataSetImportSettings) {
      // file upload settings:
      angular.extend(fileUploadProvider.defaults, {
        url: dataSetImportSettings.uploadUrl,
        maxChunkSize: dataSetImportSettings.chunkSize,
        sequentialUploads: true,
        autoUpload: false,
        processQueue: [
          {
            action: 'calculate_checksum',
            acceptFileTypes: '@',
            chunkSize: '@maxChunkSize'
          }
        ]
      });
    }
  ]);
