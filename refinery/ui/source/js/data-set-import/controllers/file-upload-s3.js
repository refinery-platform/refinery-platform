(function () {
  'use strict';

  angular
    .module('refineryDataSetImport')
    .controller('RefineryFileUploadS3Ctrl', RefineryFileUploadS3Ctrl);

  RefineryFileUploadS3Ctrl.$inject = ['s3UploadService', '$log'];

  function RefineryFileUploadS3Ctrl (s3UploadService, $log) {
    var vm = this;

    var isFileNew = function (file) {
      // check if file upload has been attempted
      return typeof file.progress === 'undefined';
    };

    vm.addFiles = function (files) {
      if (typeof vm.files === 'undefined') {
        vm.files = files;
      } else {
        vm.files = vm.files.concat(files);
      }
      $log.info('Number of files: ' + vm.files.length);
    };

    vm.isFileUploadInProgress = function (file) {
      if (typeof file.progress === 'undefined') {
        return false;
      }
      return file.progress < 100;
    };

    vm.isUploadEnabled = function () {
      if (typeof vm.files === 'undefined' || vm.files.some(vm.isFileUploadInProgress)) {
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
        for (var i = 0; i < vm.files.length; i++) {
          if (isFileNew(vm.files[i])) {
            vm.uploadFile(vm.files[i]);
          }
        }
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
