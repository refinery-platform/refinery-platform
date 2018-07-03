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

  ImportConfirmationModalCtrl.$inject = ['$uibModalInstance'];

  function ImportConfirmationModalCtrl ($uibModalInstance) {
    var vm = this;
    vm.cancel = cancel;
    vm.confirm = confirm;

    /**
     * @name cancel
     * @desc  vm modal methods used to cancel selecting a new tool to maintain
     * current launch configs
     * @memberOf refineryDataSetImport.ImportConfirmationModalCtrl
    **/
    function cancel () {
      $uibModalInstance.dismiss('cancel');
    }

    /**
     * @name confirm
     * @desc  vm modal method used to confirm a reset of the tool params and
     * select a new tool
     * @memberOf refineryDataSetImport.ImportConfirmationModalCtrl
    **/
    function confirm () {
      $uibModalInstance.close('close');
    }
  }
})();
