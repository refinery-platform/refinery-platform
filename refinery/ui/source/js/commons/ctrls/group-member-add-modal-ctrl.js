/**
 * Group Add Modal Ctrl
 * @namespace Group Add Modal Ctrl
 * @desc Main controller for the adding a new member to a group modal
 * @memberOf refineryApp
 */
(function () {
  'use strict';

  angular
    .module('refineryApp')
    .controller('GroupMemberAddModalCtrl', GroupMemberAddModalCtrl);

  GroupMemberAddModalCtrl.$inject = [
    '$log',
    'groupInviteService'
  ];

  function GroupMemberAddModalCtrl (
    $log,
    groupInviteService
  ) {
    var vm = this;
    vm.alertType = 'info';
    vm.close = close;
    vm.form = { email: '' };
    vm.isLoading = false;
    vm.responseMessage = '';
    vm.sendInvite = sendInvite;

    /*
     * ---------------------------------------------------------
     * Methods Definitions
     * ---------------------------------------------------------
     */
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
        vm.responseMessage = 'Error, invitiation could not be sent to ' + email;
      }
    }

    /**
     * @name sendInvite
     * @desc  view method use to send group invite to user
     * @memberOf refineryApp.GroupMemberAddModalCtrl.
    **/
    function sendInvite () {
      vm.responseMessage = '';
      vm.isLoading = true;
      groupInviteService.send({
        recipient_email: vm.form.email,
        group_uuid: vm.resolve.config.group.uuid
      })
      .$promise
      .then(
        function () {
          vm.isLoading = false;
          generateAlertMessage('success', vm.form.email);
        }, function (error) {
          vm.isLoading = false;
          generateAlertMessage('danger', vm.form.email);
          $log.error(error);
        }
      );
    }
    vm.$onInit = function () {
      vm.groupName = vm.resolve.config.group.name;
    };
  }
})();
