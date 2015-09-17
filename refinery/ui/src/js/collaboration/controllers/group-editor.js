function GroupEditorCtrl($modalInstance, groupService, groupMemberService, groupDataService, group) {
  var that = this;
  that.$modalInstance = $modalInstance;
  that.groupService = groupService;
  that.groupMemberService = groupMemberService;
  that.groupDataService = groupDataService;
  that.group = group;
}

GroupEditorCtrl.prototype.leaveGroup = function () {
  var that = this;

  this.groupMemberService.remove({
    uuid: this.group.uuid,
    userId: user_id
  }).$promise.then(
    function (data) {
      that.groupDataService.update();
      that.$modalInstance.dismiss();
    }
  ).catch(function (error) {
    console.error(error);
    bootbox.alert("Are you the only member or manager left?");
  });
};

GroupEditorCtrl.prototype.deleteGroup = function () {
  var that = this;

  this.groupService.delete({
    uuid: this.group.uuid
  }).$promise.then(
    function (data) {
      that.groupDataService.update();
      that.$modalInstance.dismiss();
    }
  ).catch(function (error) {
    console.error(error);
    bootbox.alert("Group could not be deleted");
  });
};

angular
  .module('refineryCollaboration')
  .controller('GroupEditorCtrl', [
    '$modalInstance',
    'groupService',
    'groupMemberService',
    'groupDataService',
    'group',
    GroupEditorCtrl
  ]);