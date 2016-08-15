'use strict';

function fileUploadStatusService () {
  var vm = this;
  vm.fileUploadStatus = 'none';

  /* Helper method to reset the selected Workflow to placeholder
  Used by ui-select dropdown in analyze tab */
  vm.resetFileUploadStatus = function () {
    vm.selectedWorkflow = 'none';
  };

  /**
   * * Used by UI to deactive Upload Data Set Button depending on the file
   * upload status. none: No files added or All files uploaded, queue: Files
   * have been added but not uploaded, running: Files are being uploaded.
   * @param { string } status - none, queue, running
   */
  vm.setFileUploadStatus = function (status) {
    vm.fileUploadStatus = status;
  };
}

angular.module('refineryDataSetImport')
  .service('fileUploadStatusService', [
    fileUploadStatusService
  ]
);
