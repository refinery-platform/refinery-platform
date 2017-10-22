/**
 * API Response Modal Ctrl
 * @namespace APIResponseModalCtrl
 * @desc Main controller for the generic api response modal partial
 * compenent. Fields which are available: header, introMsg, msgType,
 * apiStatus, apiMessage
 * @memberOf refineryApp.refineryToolLaunch
 */
(function () {
  'use strict';

  angular
    .module('refineryApp')
    .controller('APIResponseModalCtrl', APIResponseModalCtrl);

  APIResponseModalCtrl.$inject = ['_'];

  function APIResponseModalCtrl (
    _
  ) {
    // Bootstrap text classes
    var msgTypeOptions = ['primary', 'success', 'danger', 'warning'];
    var vm = this;
    vm.addIcon = false;
    vm.modalData = {
      introMsg: 'The API responded with the following status and message.',
      header: 'API Response',
      apiStatus: '',
      apiMsg: '',
      msgType: msgTypeOptions[0] // Note a null msgType will leave a black font.
    };
    vm.closeModal = closeModal;

    /*
   * ----------------------------------------------------------------------------
   * Methods Definitions
   * -----------------------------------------------------------------------------
   */
    /**
     * @name closeModal
     * @desc  VM methods used to close (dimiss) the modal
     * @memberOf APIResponseModalCtrl
    **/
    function closeModal () {
      vm.modalInstance.close();
    }

    /*
   * ---------------------------------------------------------
   * LifeCycle Hooks
   * ---------------------------------------------------------
   */
    vm.$onInit = function () {
      if (!_.isUndefined(vm.resolve) && !_.isUndefined(vm.resolve.modalData)) {
         // merge the incoming data into the initialized modalData
        Object.assign(vm.modalData, vm.resolve.modalData);
      }

      // ensure bootstrap classes are used or no class at all
      if (_.has(vm.modalData, 'msgType') &&
        _.indexOf(msgTypeOptions, vm.modalData.msgType)) {
        vm.modalData.textMsgType = 'text-' + vm.modalData.msgType;
        if (vm.modalData.msgType !== 'primary') {
          vm.addIcon = true;
        }
      }
    };
  }
})();
