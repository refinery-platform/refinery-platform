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
  var that = this;

  that.groupInviteService.send({
    email: email,
    group_id: that.groupDataService.activeGroup.id
  })
  .$promise
  .then(
    function () {
      that.bootbox.alert('Invitation successfully sent to ' + email);
      that.groupDataService.update();
      that.$uibModalInstance.dismiss();
    }
  ).catch(function () {
    that.bootbox.alert(
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
