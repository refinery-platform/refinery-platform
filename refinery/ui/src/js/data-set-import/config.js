angular
  .module('refineryDataSetImport')
  .config([
    '$httpProvider',
    'fileUploadProvider',
    function ($httpProvider, fileUploadProvider) {
      "use strict";
      // file upload settings:
      angular.extend(fileUploadProvider.defaults, {
      //  maxChunkSize: chunkSize,
      //  sequentialUploads: true,
      //  autoUpload: false,
      //  formData: getFormData,
      //  chunkdone: chunkDone,
      //  submit: uploadSubmit,
      //  done: uploadDone,
      });
    }
  ]);
