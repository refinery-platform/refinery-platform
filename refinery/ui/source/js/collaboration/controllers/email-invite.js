'use strict';

function EmailInviteCtrl (
  bootbox, $uibModalInstance, groupInviteService, groupDataService
) {
  var vm = this;
  vm.bootbox = bootbox;
  vm.$uibModalInstance = $uibModalInstance;
  vm.groupInviteService = groupInviteService;
  vm.groupDataService = groupDataService;
  vm.responseMessage = '';

  vm.sendInvite = function (email) {
    vm.groupInviteService.send({
      email: email,
      group_id: vm.groupDataService.activeGroup.id
    })
    .$promise
    .then(
      function () {
        vm.responseMessage = 'Invitation successfully sent to ' + email;
        vm.groupDataService.update();
      }, function (error) {
        vm.responseMessage = 'Invitiation could not be sent.' + error;
      }
    );
  };

  vm.close = function () {
    vm.$uibModalInstance.dismiss();
  };
}

angular
  .module('refineryCollaboration')
  .controller('EmailInviteCtrl', [
    'bootbox',
    '$uibModalInstance',
    'groupInviteService',
    'groupDataService',
    EmailInviteCtrl
  ]);
