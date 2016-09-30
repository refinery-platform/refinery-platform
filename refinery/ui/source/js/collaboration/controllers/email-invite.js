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

  vm.generateAlertMessage = function (infoType, email) {
    if (infoType === 'info') {
      vm.alertType = 'info';
      vm.responseMessage = 'Invitation successfully sent to ' + email;
    } else if (infoType === 'error') {
      vm.alertType = 'error';
      vm.responseMessage = 'Invitiation could not be sent to' + email;
    }
  };

  vm.sendInvite = function (email) {
    groupInviteService.send({
      email: email,
      group_id: groupDataService.activeGroup.id
    })
    .$promise
    .then(
      function () {
        vm.generateAlertMessage('info', email);
        groupDataService.update();
        $timeout(function () {
          $uibModalInstance.dismiss();
        }, 3000);
      }, function (error) {
        vm.generateAlertMessage('error', email);
        $log.error(error);
      }
    );
  };

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
