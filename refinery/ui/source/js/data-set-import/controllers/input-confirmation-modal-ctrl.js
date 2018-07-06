/**
 * Import Confirmation Modal Ctrl
 * @namespace ImportConfirmationModalCtrl
 * @desc Modal controller for displaying a warning when a User performs a
 * metadata revision.
 * @memberOf refineryApp.refineryDataSetImport
 */
(function () {
  'use strict';

  angular
    .module('refineryDataSetImport')
    .controller('ImportConfirmationModalCtrl', ImportConfirmationModalCtrl);

  function ImportConfirmationModalCtrl () {
    var vm = this;
    vm.cancel = cancel;
    vm.confirm = confirm;

    /**
     * @name cancel
     * @desc  vm modal method used to cancel a metadata revision import
     * @memberOf refineryDataSetImport.ImportConfirmationModalCtrl
    **/
    function cancel () {
      vm.modalInstance.dismiss('cancel');
    }

    /**
     * @name confirm
     * @desc  vm modal method used to confirm and proceed with a metadata
     * revision import
     * @memberOf refineryDataSetImport.ImportConfirmationModalCtrl
    **/
    function confirm () {
      vm.modalInstance.close('close');
    }
  }
})();
