(function () {
  'use strict';

  angular
    .module('refineryDataSetImport')
    .controller('RefineryFileUploadS3Ctrl', RefineryFileUploadS3Ctrl);

  RefineryFileUploadS3Ctrl.$inject = ['s3UploadService'];

  function RefineryFileUploadS3Ctrl (s3UploadService) {
    var vm = this;

    vm.addFiles = function (files) {
      vm.files = files;
    };

    vm.isFileUploadInProgress = function (file) {
      return file.progress < 100;
    };

    vm.isUploadEnabled = function () {
      function isFileNew (file) {
        // check if file upload has been attempted
        return typeof file.progress === 'undefined';
      }
      if (typeof vm.files === 'undefined') {
        return false;
      }
      if (vm.files.some(vm.isFileUploadInProgress)) {
        return false;
      }
      return vm.files.some(isFileNew);
    };

    vm.areFileUploadsInProgress = function () {
      if (typeof vm.files === 'undefined') {
        return false;
      }
      return vm.files.some(vm.isFileUploadInProgress);
    };

    vm.uploadFile = function (file) {
      file.progress = 0;
      s3UploadService.upload(file).then(function () {
        file.success = true;
      }, function (error) {
        vm.error = error;
      }, function (progress) {
        // write the progress as a percentage
        file.progress = (progress.loaded / progress.total) * 100;
      });
    };

    vm.uploadFiles = function () {
      if (vm.files) {
        angular.forEach(vm.files, vm.uploadFile);
      }
    };

    vm.cancelUpload = function (file) {
      // stub
      return file;
    };

    vm.cancelUploads = function () {
      if (vm.files) {
        angular.forEach(vm.files, vm.cancelUpload);
      }
    };
  }
})();
