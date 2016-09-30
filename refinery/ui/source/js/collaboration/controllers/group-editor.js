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
  this.errorFlag = false;

  this.close = function () {
    this.$uibModalInstance.dismiss();
  };
}

GroupEditorCtrl.prototype.leaveGroup = function () {
  var that = this;
  that.errorFlag = false;

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
        }, function () {
          that.errorFlag = true;
          that.errorMessage = 'Error leaving group. If last member, delete' +
            ' group.';
        });
      } else {
        that.bootbox.alert('Error: You are not authenticated.');
      }
    })
    .catch(function () {
      that.bootbox.alert('Something went wrong. Please try again');
    });
};

GroupEditorCtrl.prototype.deleteGroup = function () {
  var that = this;
  that.errorFlag = false;

  that.groupExtendedService.delete({
    uuid: that.group.uuid
  })
  .$promise
  .then(function () {
    that.groupDataService.update();
    that.$uibModalInstance.dismiss();
  }, function () {
    that.errorFlag = true;
    that.errorMessage = 'Group could not be deleted.';
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
