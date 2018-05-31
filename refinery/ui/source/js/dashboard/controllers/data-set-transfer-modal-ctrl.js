/**
 * Data Set Transfer Modal Ctrl
 * @namespace DataSetTransferModalCtrl
 * @desc Controller for modal to transfer a data set ownership to another user
 * member to a group modal
 * @memberOf refineryDashboard
 */
(function () {
  'use strict';

  angular
    .module('refineryDashboard')
    .controller('DataSetTransferModalCtrl', DataSetTransferModalCtrl);

  DataSetTransferModalCtrl.$inject = [
    '$log',
    'dataSetV2Service',
    'settings'
  ];

  function DataSetTransferModalCtrl (
    $log,
    dataSetV2Service,
    settings
  ) {
    var vm = this;
    vm.alertType = 'info';
    vm.cancel = cancel;
    vm.close = close;
    vm.dataSetTitle = '';
    vm.form = { email: '' };
    vm.instanceName = settings.djangoApp.refineryInstanceName;
    vm.isLoading = false;
    vm.responseMessage = '';
    vm.sendTransferRequest = sendTransferRequest;

    /*
     * ---------------------------------------------------------
     * Methods Definitions
     * ---------------------------------------------------------
     */
    /**
     * @name cancel
     * @desc  View method to cancel modals, expects modalInstance in scope
     * @memberOf refineryApp.refineryDashboard.
    **/
    function cancel () {
      vm.modalInstance.dismiss('cancel');
    }

    /**
     * @name close
     * @desc  View method to cancel modals, expects modalInstance in scope
     * @memberOf refineryApp.refineryDashboard.
    **/
    function close () {
      vm.modalInstance.close(vm.alertType);
    }

    /**
     * @name generateAlertMessage
     * @desc  helper method to generate api response notification
     * @memberOf refineryApp.refineryDashboard.
    **/
    function generateAlertMessage (infoType, email, error) {
      if (infoType === 'success') {
        vm.alertType = 'success';
        vm.responseMessage = 'Data set successfully transferred to ' + email;
      } else if (infoType === 'danger') {
        vm.alertType = 'danger';
        if (error.status === 404) {
          vm.responseMessage = email + ' is not associated with any users. ' +
            "Check the user's profile for the associated email or invite" +
            ' new users through the collaboration card.';
        } else {
          vm.responseMessage = 'Error, data set could not be transferred to ' + email;
        }
      }
    }

    /**
     * @name sendTransferRequest
     * @desc view method used to request a data set transfer
     * @memberOf refineryApp.Dashboard
    **/
    function sendTransferRequest () {
      vm.responseMessage = '';
      vm.isLoading = true;
      dataSetV2Service.partial_update({
        new_owner_email: vm.form.email,
        transfer_data_set: true,
        uuid: vm.resolve.config.uuid
      })
      .$promise
      .then(
        function () {
          vm.isLoading = false;
          generateAlertMessage('success', vm.form.email);
        }, function (error) {
          vm.isLoading = false;
          generateAlertMessage('danger', vm.form.email, error);
          $log.error(error);
        }
      );
    }

    vm.$onInit = function () {
      vm.dataSetTitle = vm.resolve.config.title;
    };
  }
})();
