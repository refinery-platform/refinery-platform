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

  FileUploadCommandLineModalCtrl.$inject = ['settings'];

  function FileUploadCommandLineModalCtrl (
    settings
  ) {
    var vm = this;
    vm.close = close;
    console.log('in the modal ctrl');
    console.log(AWS.config);
    vm.accessKeyId = '';
    vm.secertAccessKey = '';
    vm.sessionToken = '';
    vm.bucketName = settings.djangoApp.uploadBucket;
    vm.identityId = '';
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
  }
})();
