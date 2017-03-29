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
          $uibModalInstance.dismiss();
        }, 1500);
      }, function (error) {
        generateAlertMessage('danger', email);
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
