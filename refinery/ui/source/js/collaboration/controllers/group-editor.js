'use strict';

function GroupEditorCtrl (
  bootbox,
  $uibModalInstance,
  groupExtendedService,
  groupMemberService,
  groupDataService,
  group,
  authService,
  sessionService
) {
  this.bootbox = bootbox;
  this.$uibModalInstance = $uibModalInstance;
  this.groupExtendedService = groupExtendedService;
  this.groupMemberService = groupMemberService;
  this.groupDataService = groupDataService;
  this.group = group;
  this.authService = authService;
  this.sessionService = sessionService;
}

GroupEditorCtrl.prototype.leaveGroup = function () {
  var that = this;

  that.authService.isAuthenticated()
    .then(function (isAuthenticated) {
      if (isAuthenticated) {
        that.groupMemberService.remove({
          uuid: that.group.uuid,
          userId: that.sessionService.get('userId')
        })
        .$promise
        .then(function () {
          that.groupDataService.update();
          that.$uibModalInstance.dismiss();
        })
        .catch(function () {
          that.bootbox.alert('Are you the only member or manager left?');
        });
      } else {
        that.bootbox.alert('Sorry, you\'re not authenticated.');
      }
    })
    .catch(function () {
      that.bootbox.alert('Something went wrong. Please try again');
    });
};

GroupEditorCtrl.prototype.deleteGroup = function () {
  var that = this;

  that.groupExtendedService.delete({
    uuid: that.group.uuid
  })
  .$promise
  .then(function () {
    that.groupDataService.update();
    that.$uibModalInstance.dismiss();
  })
  .catch(function () {
    that.bootbox.alert('Group could not be deleted');
  });
};

angular
  .module('refineryCollaboration')
  .controller('GroupEditorCtrl', [
    'bootbox',
    '$uibModalInstance',
    'groupExtendedService',
    'groupMemberService',
    'groupDataService',
    'group',
    'authService',
    'sessionService',
    GroupEditorCtrl
  ]);
