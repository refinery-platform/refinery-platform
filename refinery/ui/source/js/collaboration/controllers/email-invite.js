'use strict';

function EmailInviteCtrl (
  bootbox, $uibModalInstance, groupInviteService, groupDataService
) {
  var vm = this;
  vm.bootbox = bootbox;
  vm.$uibModalInstance = $uibModalInstance;
  vm.groupInviteService = groupInviteService;
  vm.groupDataService = groupDataService;

  vm.sendInvite = function (email) {
    vm.groupInviteService.send({
      email: email,
      group_id: vm.groupDataService.activeGroup.id
    })
    .$promise
    .then(
      function () {
        vm.bootbox.alert('Invitation successfully sent to ' + email);
        vm.groupDataService.update();
        vm.$uibModalInstance.dismiss();
      }
    ).catch(function () {
      vm.bootbox.alert(
        'Oh no, something went terribly wrong. We\'re very sorry but the ' +
        'invitation couldn\'t be send out.'
      );
    });
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
