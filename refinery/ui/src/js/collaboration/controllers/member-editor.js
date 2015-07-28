function MemberEditorCtrl($modalInstance, groupDataService, groupMemberService, member) {
  var that = this;
  that.$modalInstance = $modalInstance;
  that.groupDataService = groupDataService;
  that.groupMemberService = groupMemberService;
  that.member = member;
}

MemberEditorCtrl.prototype.promote = function () {
  var that = this;

  this.groupMemberService.add({
    uuid: that.groupDataService.activeGroup.manager_group_uuid,
    user_id: that.member.user_id
  }).$promise.then(
    function (data) {
      that.groupDataService.update();
      that.$modalInstance.dismiss();
    }
  ).catch(function (error) {
    console.error(error);
  });
};

MemberEditorCtrl.prototype.demote = function () {
  var that = this;

  that.groupMemberService.remove({
    uuid: that.groupDataService.activeGroup.manager_group_uuid,
    userId: that.member.user_id
  }).$promise.then(
    function (data) {
      that.groupDataService.update();
      that.$modalInstance.dismiss();
    }
  ).catch(function (error) {
    console.error(error);
  });
};

MemberEditorCtrl.prototype.remove = function () {
  var that = this;

  that.groupMemberService.remove({
    uuid: that.groupDataService.activeGroup.uuid,
    userId: that.member.user_id
  }).$promise.then(
    function (data) {
      that.groupDataService.update();
      that.$modalInstance.dismiss();
    }
  ).catch(function (error) {
    console.error(error);
  });
};

angular
  .module('refineryCollaboration')
  .controller('MemberEditorCtrl',[
    '$modalInstance',
    'groupDataService',
    'groupMemberService',
    'member',
    MemberEditorCtrl
  ]);