/**
 * Group Add Modal Ctrl
 * @namespace Group Add Modal Ctrl
 * @desc Main controller for the group edit modal
 * @memberOf refineryApp
 */
(function () {
  'use strict';

  angular
    .module('refineryApp')
    .controller('GroupMemberAddModalCtrl', GroupMemberAddModalCtrl);

  GroupMemberAddModalCtrl.$inject = [
    '$log',
    '$timeout',
    'groupDataService',
    'groupInviteService'
  ];

  function GroupMemberAddModalCtrl (
    $log,
    $timeout,
    groupDataService,
    groupInviteService
  ) {
    var vm = this;
    vm.alertType = 'info';
    vm.cancel = cancel;
    vm.close = close;
    vm.responseMessage = '';
    vm.sendInvite = sendInvite;

    /*
     * ---------------------------------------------------------
     * Methods Definitions
     * ---------------------------------------------------------
     */
    /**
     * @name cancel
     * @desc  View method to cancel modals, expects modalInstance in scope
     * @memberOf refineryApp.GroupMemberAddModalCtrl.
    **/
    function cancel () {
      vm.modalInstance.dismiss('cancel');
    }

    /**
     * @name close
     * @desc  View method to cancel modals, expects modalInstance in scope
     * @memberOf refineryApp.GroupMemberAddModalCtrl.
    **/
    function close () {
      vm.modalInstance.close(vm.alertType);
    }

    /**
     * @name generateAlertMessage
     * @desc  helper method to generate api response notification
     * @memberOf refineryApp.GroupMemberAddModalCtrl.
    **/
    function generateAlertMessage (infoType, email) {
      if (infoType === 'success') {
        vm.alertType = 'success';
        vm.responseMessage = 'Successfully sent invitation to ' + email;
      } else if (infoType === 'danger') {
        vm.alertType = 'danger';
        vm.responseMessage = 'Error, invitiation could not be sent to' + email;
      }
    }

    /**
     * @name sendInvite
     * @desc  view method use to send group invite to user
     * @memberOf refineryApp.GroupMemberAddModalCtrl.
    **/
    function sendInvite (email) {
      groupInviteService.send({
        email: email,
        group_id: vm.resolve.config.group.id
      })
      .$promise
      .then(
        function () {
          generateAlertMessage('success', email);
          groupDataService.update();
          // Automatically dismisses modal
          $timeout(function () {
            vm.modalInstance.close(vm.alertType);
          }, 1500);
        }, function (error) {
          generateAlertMessage('danger', email);
          $log.error(error);
        }
      );
    }
  }
})();
