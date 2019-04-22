/**
 * File Upload Command Line Modal Ctrl
 * @namespace FileUploadCommandLineModalCtrl
 * @desc Main controller for the file upload command line modal
 * @memberOf refineryApp.refineryDataSetImport
 */
(function () {
  'use strict';

  angular
    .module('refineryDataSetImport')
    .controller('FileUploadCommandLineModalCtrl', FileUploadCommandLineModalCtrl);

  FileUploadCommandLineModalCtrl.$inject = ['_', 'AWS', 'settings'];

  function FileUploadCommandLineModalCtrl (
    _,
    AWS,
    settings
  ) {
    var vm = this;
    vm.close = close;
    /*
     * ---------------------------------------------------------
     * Methods Definitions
     * ---------------------------------------------------------
     */
    /**
     * @name close
     * @desc  View method to close modals, expects modalInstance in scope
     * @memberOf refineryDataSetImport.FileUploadCommandLineModalCtrl
    **/
    function close () {
      vm.modalInstance.close(vm.alertType);
    }
    /*
   * ---------------------------------------------------------
   * Watchers
   * ---------------------------------------------------------
   */
    vm.$onInit = function () {
      if (AWS.config.credentials) { // otherwise equals null
        // credentials initialized in file-upload-s3-service when user selects yes
        vm.accessKeyId = AWS.config.credentials.accessKeyId;
        vm.secertAccessKey = AWS.config.credentials.secretAccessKey;
        vm.sessionToken = AWS.config.credentials.sessionToken;
        vm.identityId = AWS.config.credentials.identityId;
      }

      if (!_.isEmpty(settings.djanoApp)) {
        vm.bucketName = settings.djangoApp.uploadBucket;
      }
    };
  }
})();
