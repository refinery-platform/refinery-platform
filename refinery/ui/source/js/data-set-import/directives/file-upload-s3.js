(function () {
  'use strict';

  angular
    .module('refineryDataSetImport')
    .directive('rpFileUploadS3', rpFileUploadS3);

  rpFileUploadS3.$inject = ['$window'];

  function rpFileUploadS3 ($window) {
    return {
      restrict: 'E',
      bindToController: {
        isNodeUpdate: '=',
        fileName: '='
      },
      controller: 'RefineryFileUploadS3Ctrl as FileCtrl',
      templateUrl: function () {
        return $window.getStaticUrl('partials/data-set-import/partials/file-upload-s3.html');
      }
    };
  }
})();
