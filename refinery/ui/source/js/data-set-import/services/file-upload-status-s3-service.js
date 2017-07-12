(function () {
  'use strict';

  angular
    .module('refineryDataSetImport')
    .service('s3UploadStatusService', s3UploadStatusService);

  s3UploadStatusService.$inject = [];

  function s3UploadStatusService () {
    var vm = this;
    vm.fileUploadStatus = 'none';

    vm.setFileUploadStatus = function (status) {
      var statusOptions = ['none', 'queuing', 'running'];
      if (statusOptions.includes(status)) {
        vm.fileUploadStatus = status;
      }
      // else?
      return vm.fileUploadStatus;
    };
  }
})();
