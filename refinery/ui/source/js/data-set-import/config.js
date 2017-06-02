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
            action: 'initializeChunkIndex',
            acceptFileTypes: '@',
            chunkSize: '@maxChunkSize'
          }
        ]
      });
    }
  ]);
