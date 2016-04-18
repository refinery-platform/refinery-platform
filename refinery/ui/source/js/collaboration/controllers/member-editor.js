'use strict';

function MemberEditorCtrl (
  bootbox, $uibModalInstance, groupDataService, groupMemberService, member
) {
  this.bootbox = bootbox;
  this.$uibModalInstance = $uibModalInstance;
  this.groupDataService = groupDataService;
  this.groupMemberService = groupMemberService;
  this.member = member;
}

MemberEditorCtrl.prototype.promote = function () {
  var that = this;

  that.groupMemberService.add({
    uuid: that.groupDataService.activeGroup.manager_group_uuid,
    user_id: that.member.user_id
  }).$promise.then(
    function () {
      that.groupDataService.update();
      that.$uibModalInstance.dismiss();
    }
  ).catch(function () {
    that.bootbox.alert('Could not promote member');
  });
};

MemberEditorCtrl.prototype.demote = function () {
  var that = this;

  that.groupMemberService.remove({
    uuid: that.groupDataService.activeGroup.manager_group_uuid,
    userId: that.member.user_id
  }).$promise.then(
    function () {
      that.groupDataService.update();
      that.$uibModalInstance.dismiss();
    }
  ).catch(function () {
    that.bootbox.alert('Are you the only member or manager left?');
  });
};

MemberEditorCtrl.prototype.remove = function () {
  var that = this;

  that.groupMemberService.remove({
    uuid: that.groupDataService.activeGroup.uuid,
    userId: that.member.user_id
  }).$promise.then(
    function () {
      that.groupDataService.update();
      that.$uibModalInstance.dismiss();
    }
  ).catch(function () {
    that.bootbox.alert('Are you the only member or manager left?');
  });
};

angular
  .module('refineryCollaboration')
  .controller('MemberEditorCtrl', [
    'bootbox',
    '$uibModalInstance',
    'groupDataService',
    'groupMemberService',
    'member',
    MemberEditorCtrl
  ]);
