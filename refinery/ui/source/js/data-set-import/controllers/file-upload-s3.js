(function () {
  'use strict';

  angular
    .module('refineryDataSetImport')
    .controller('RefineryFileUploadS3Ctrl', RefineryFileUploadS3Ctrl);

  RefineryFileUploadS3Ctrl.$inject = ['s3UploadService'];

  function RefineryFileUploadS3Ctrl (s3UploadService) {
    var vm = this;
    vm.uploadFiles = function (files) {
      vm.files = files;
      if (files && files.length > 0) {
        angular.forEach(vm.files, function (file) {
          s3UploadService.upload(file).then(function () {
            // Mark as success
            file.success = true;
          }, function (error) {
            // Mark the error
            vm.error = error;
          }, function (progress) {
            // Write the progress as a percentage
            file.progress = (progress.loaded / progress.total) * 100;
          });
        });
      }
    };
  }
})();
