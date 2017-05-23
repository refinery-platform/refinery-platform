(function () {
  'use strict';

  angular
    .module('refineryDataSetImport')
    .controller('RefineryFileUploadS3Ctrl', RefineryFileUploadS3Ctrl);

  RefineryFileUploadS3Ctrl.$inject = ['$scope', 's3UploadService'];

  function RefineryFileUploadS3Ctrl ($scope, s3UploadService) {
    $scope.uploadFiles = function (files) {
      $scope.files = files;
      if (files && files.length > 0) {
        angular.forEach($scope.files, function (file) {
          s3UploadService.upload(file).then(function () {
            // Mark as success
            file.success = true;
          }, function (error) {
            // Mark the error
            $scope.error = error;
          }, function (progress) {
            // Write the progress as a percentage
            file.progress = (progress.loaded / progress.total) * 100;
          });
        });
      }
    };
  }
})();
