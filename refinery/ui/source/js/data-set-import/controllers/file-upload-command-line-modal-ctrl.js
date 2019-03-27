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

  FileUploadCommandLineModalCtrl.$inject = [];

  function FileUploadCommandLineModalCtrl (
  ) {
    var vm = this;
    vm.close = close;
    console.log('in the modal ctrl');
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
