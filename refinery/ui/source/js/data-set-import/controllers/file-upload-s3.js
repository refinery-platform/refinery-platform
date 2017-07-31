(function () {
  'use strict';

  angular
    .module('refineryDataSetImport')
    .controller('RefineryFileUploadS3Ctrl', RefineryFileUploadS3Ctrl);

  RefineryFileUploadS3Ctrl.$inject = ['s3UploadService', '$log', '$scope'];

  function RefineryFileUploadS3Ctrl (s3UploadService, $log, $scope) {
    var vm = this;

    vm.isFileNew = function (file) {
      // check if file upload has been attempted
      return typeof file.progress === 'undefined';
    };

    vm.addFiles = function (files) {
      if (typeof vm.files === 'undefined') {
        vm.files = files;
      } else {
        vm.files = vm.files.concat(files);
      }
    };

    vm.isFileUploadInProgress = function (file) {
      if (vm.isFileNew(file) || file.$error || file.success) {
        return false;
      }
      return file.progress <= 100;
    };

    vm.isUploadEnabled = function () {
      if (typeof vm.files === 'undefined' || vm.files.some(vm.isFileUploadInProgress)) {
        return false;
      }
      return vm.files.some(vm.isFileNew);
    };

    vm.areFileUploadsInProgress = function () {
      if (typeof vm.files === 'undefined') {
        return false;
      }
      return vm.files.some(vm.isFileUploadInProgress);
    };

    vm.uploadFile = function (file) {
      file.progress = 0;
      var managedUpload = s3UploadService.upload(file);
      managedUpload.on('httpUploadProgress', function (progress) {
        $scope.$apply(function () {
          // write the progress as a percentage
          file.progress = (progress.loaded / progress.total) * 100;
        });
      });
      managedUpload.promise().then(function () {
        $scope.$apply(function () {
          file.success = true;
        });
      }, function (error) {
        $scope.$apply(function () {
          vm.error = error;
          $log.error('Error uploading file ' + file + ': ' + vm.error);
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
      // stub
      return file;
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
