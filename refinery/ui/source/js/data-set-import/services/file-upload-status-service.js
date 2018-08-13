'use strict';

function fileUploadStatusService () {
  var vm = this;
  vm.fileUploadStatus = { status: 'none' };

  /**
   * * Used by UI to deactive Upload Data Set Button depending on the file
   * upload status. none: No files added or All files uploaded, queue: Files
   * have been added but not uploaded, running: Files are being uploaded.
   * @param { string } status - none, queuing, running
   */
  vm.setFileUploadStatus = function (status) {
    console.log('in the set');
    console.log(status);
    var statusOptions = ['none', 'queuing', 'running'];
    if (statusOptions.indexOf(status) > -1) {
      vm.fileUploadStatus.status = status;
    }
    return vm.fileUploadStatus.status;
  };
}

angular.module('refineryDataSetImport')
  .service('fileUploadStatusService', [
    fileUploadStatusService
  ]
);
