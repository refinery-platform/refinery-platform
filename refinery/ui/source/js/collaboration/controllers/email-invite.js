'use strict';

function EmailInviteCtrl (
  bootbox, $uibModalInstance, groupInviteService, groupDataService
) {
  this.bootbox = bootbox;
  this.$uibModalInstance = $uibModalInstance;
  this.groupInviteService = groupInviteService;
  this.groupDataService = groupDataService;
}

EmailInviteCtrl.prototype.sendInvite = function (email) {
  var vm = this;

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

angular
  .module('refineryCollaboration')
  .controller('EmailInviteCtrl', [
    'bootbox',
    '$uibModalInstance',
    'groupInviteService',
    'groupDataService',
    EmailInviteCtrl
  ]);
