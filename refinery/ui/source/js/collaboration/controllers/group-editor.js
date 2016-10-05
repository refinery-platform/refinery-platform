'use strict';

function GroupEditorCtrl (
  $uibModalInstance,
  groupExtendedService,
  groupMemberService,
  groupDataService,
  group,
  authService,
  sessionService
) {
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
        that.errorFlag = true;
        that.errorMessage = 'Error, please log in.';
      }
    })
    .catch(function () {
      that.errorFlag = true;
      that.errorMessage = 'Error, please try again.';
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
    '$uibModalInstance',
    'groupExtendedService',
    'groupMemberService',
    'groupDataService',
    'group',
    'authService',
    'sessionService',
    GroupEditorCtrl
  ]);
