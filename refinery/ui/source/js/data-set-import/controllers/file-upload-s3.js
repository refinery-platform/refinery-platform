(function () {
  'use strict';

  angular
    .module('refineryDataSetImport')
    .controller('RefineryFileUploadS3Ctrl', RefineryFileUploadS3Ctrl);

  RefineryFileUploadS3Ctrl.$inject = ['s3UploadService', '$log', '$scope'];

  function RefineryFileUploadS3Ctrl (s3UploadService, $log, $scope) {
    var vm = this;

    vm.isUploadConfigured = function () {
      if (s3UploadService.isConfigReady) {
        return s3UploadService.isConfigValid();
      }
      return false;
    };

    vm.addFiles = function (files) {
      if (typeof vm.files === 'undefined') {
        vm.files = files;
      } else {
        vm.files = vm.files.concat(files);
      }
    };

    vm.isFileNew = function (file) {
      // check if file upload has been attempted
      return typeof file.progress === 'undefined';
    };

    vm.isUploadInProgress = function (file) {
      if (vm.isFileNew(file) || file.$error || file.success) {
        return false;
      }
      return file.progress <= 100;
    };

    vm.areUploadsInProgress = function () {
      if (typeof vm.files === 'undefined') {
        return false;
      }
      return vm.files.some(vm.isUploadInProgress);
    };

    vm.isUploadEnabled = function () {
      if (typeof vm.files === 'undefined' || vm.areUploadsInProgress()) {
        return false;
      }
      return vm.files.some(vm.isFileNew);
    };

    vm.uploadFile = function (file) {
      try {
        file.managedUpload = s3UploadService.upload(file);
      } catch (e) {
        file.progress = 100;
        file.$error = 'Data upload configuration error';
        return;
      }
      file.progress = 0;
      file.managedUpload.on('httpUploadProgress', function (progress) {
        $scope.$apply(function () {
          file.progress = (progress.loaded / progress.total) * 100;
        });
      });
      file.managedUpload.promise().then(function () {
        $scope.$apply(function () {
          file.success = true;
        });
      }, function (error) {
        $scope.$apply(function () {
          file.progress = 100;
          file.$error = error;
          $log.error('Error uploading file ' + file.name + ': ' + file.$error);
        });
      });
    };

    vm.uploadFiles = function () {
      if (vm.files) {
        for (var i = 0; i < vm.files.length; i++) {
          if (vm.isFileNew(vm.files[i])) {
            vm.uploadFile(vm.files[i]);
          }
        }
      }
    };

    vm.cancelUpload = function (file) {
      file.managedUpload.abort();
      $log.warn('Upload canceled: ' + file.name);
    };

    vm.cancelUploads = function () {
      if (vm.files) {
        angular.forEach(vm.files, vm.cancelUpload);
      }
    };

    vm.deleteUpload = function (file) {
      // stub
      return file;
    };
  }
})();
