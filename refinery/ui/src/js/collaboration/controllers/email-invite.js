function EmailInviteCtrl($modalInstance, groupInviteService, groupDataService) {
  var that = this;
  that.$modalInstance = $modalInstance;
  that.groupInviteService = groupInviteService;
  that.groupDataService = groupDataService;
}

EmailInviteCtrl.prototype.sendInvite = function (email) {
  var that = this;

  that.groupInviteService.send({
    email: email,
    group_id: that.groupDataService.activeGroup.id
  }).$promise.then(
    function (data) {
      bootbox.alert("Invitation succesfully sent to " + email);
      that.groupDataService.update();
      that.$modalInstance.dismiss();
    }
  ).catch(function (error) {
    console.error(error);    
  });
};

angular
  .module('refineryCollaboration')
  .controller('EmailInviteCtrl', [
    '$modalInstance',
    'groupInviteService',
    'groupDataService',
    EmailInviteCtrl
  ]);