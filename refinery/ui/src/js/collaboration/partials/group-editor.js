function GroupEditorCtrl($modalInstance, groupService, groupListService, groupMemberService, config) {
  var that = this;
  that.$modalInstance = $modalInstance;
  that.groupService = groupService;
  that.groupListService = groupListService;
  that.groupMemberService = groupMemberService;
  that.group = config.group;
}

GroupEditorCtrl.prototype.leaveGroup = function () {
  var that = this;

  this.groupMemberService.remove({
    uuid: this.group.uuid,
    userId: user_id
  }).$promise.then(
    function (data) {
      that.groupListService.update();
      that.$modalInstance.dismiss();
    }
  ).catch(function (error) {
    console.error(error);
  });
};

GroupEditorCtrl.prototype.deleteGroup = function () {
  var that = this;

  this.groupService.delete({
    uuid: this.group.uuid
  }).$promise.then(
    function (data) {
      that.groupListService.update();
      that.$modalInstance.dismiss();
    }
  ).catch(function (error) {
    console.error(error);
  });
};

angular
  .module('refineryCollaboration')
  .controller('GroupEditorCtrl', [
    '$modalInstance',
    'groupService',
    'groupListService',
    'groupMemberService',
    'config',
    GroupEditorCtrl
  ]);