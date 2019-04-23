/**
 * File Upload Command Line Button Control
 * @namespace FileUploadCommandLineButtonCtrl
 * @desc Main controller for the button to launch modal component
 * @memberOf refineryApp.refineryDataSetImport
 */
(function () {
  'use strict';

  angular
    .module('refineryDataSetImport')
    .controller('FileUploadCommandLineButtonCtrl', FileUploadCommandLineButtonCtrl);

  FileUploadCommandLineButtonCtrl.$inject = ['$uibModal'];

  function FileUploadCommandLineButtonCtrl (
    $uibModal
  ) {
    var vm = this;
    vm.launchCommandLineModal = launchCommandLineModal;
    /*
     * ---------------------------------------------------------
     * Methods Definitions
     * ---------------------------------------------------------
     */
    /**
     * @name launchCommandLineModal
     * @desc  View method to launch modal
     * @memberOf FileUploadCommandLineButtonCtrl.launchCommandLineModal
    **/
    function launchCommandLineModal () {
      $uibModal.open({
        component: 'rpFileUploadCommandLineModal'
      });
    }
  }
})();
