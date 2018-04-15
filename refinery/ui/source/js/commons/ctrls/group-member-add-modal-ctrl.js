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
    'groupInviteService',
    'groupDataService',
    '$timeout',
    '$log',
  ];

  function GroupMemberAddModalCtrl (
    groupInviteService,
    groupDataService,
    $timeout,
    $log
  ) {
    var vm = this;
    vm.responseMessage = '';
    vm.alertType = 'info';
     // After invite is sent, an alert pops up with following message
    var generateAlertMessage = function (infoType, email) {
      if (infoType === 'success') {
        vm.alertType = 'success';
        vm.responseMessage = 'Successfully sent invitation to ' + email;
      } else if (infoType === 'danger') {
        vm.alertType = 'danger';
        vm.responseMessage = 'Error, invitiation could not be sent to' + email;
      }
    };

     // Post email invite to group api
    vm.sendInvite = function (email) {
      groupInviteService.send({
        email: email,
        group_id: groupDataService.activeGroup.id
      })
      .$promise
      .then(
        function () {
          generateAlertMessage('success', email);
          groupDataService.update();
          // Automatically dismisses modal
          $timeout(function () {
            vm.modalInstance.dismiss();
          }, 1500);
        }, function (error) {
          generateAlertMessage('danger', email);
          $log.error(error);
        }
      );
    };

    // UI helper methods to cancel and close modal instance
    vm.cancel = function () {
      vm.modalInstance.dismiss('cancel');
    };

    vm.close = function () {
      vm.modalInstance.dismiss();
    };
  }
})();
