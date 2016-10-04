'use strict';

function EmailInviteCtrl (
  $uibModalInstance,
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
    if (infoType === 'info') {
      vm.alertType = 'info';
      vm.responseMessage = 'Invitation successfully sent to ' + email;
    } else if (infoType === 'error') {
      vm.alertType = 'error';
      vm.responseMessage = 'Invitiation could not be sent to' + email;
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
        generateAlertMessage('info', email);
        groupDataService.update();
        // Automatically dismisses modal
        $timeout(function () {
          $uibModalInstance.dismiss();
        }, 1500);
      }, function (error) {
        vm.generateAlertMessage('error', email);
        $log.error(error);
      }
    );
  };

  // UI helper methods to cancel and close modal instance
  vm.cancel = function () {
    $uibModalInstance.dismiss('cancel');
  };

  vm.close = function () {
    $uibModalInstance.dismiss();
  };
}

angular
  .module('refineryCollaboration')
  .controller('EmailInviteCtrl', [
    '$uibModalInstance',
    'groupInviteService',
    'groupDataService',
    '$timeout',
    '$log',
    EmailInviteCtrl
  ]);
