'use strict';

function GroupEditorCtrl (
  $uibModalInstance,
  $timeout,
  groupExtendedService,
  groupMemberService,
  groupDataService,
  group,
  authService,
  sessionService
) {
  this.$uibModalInstance = $uibModalInstance;
  this.$timeout = $timeout;
  this.groupExtendedService = groupExtendedService;
  this.groupMemberService = groupMemberService;
  this.groupDataService = groupDataService;
  this.group = group;
  this.authService = authService;
  this.sessionService = sessionService;
  this.responseMessage = '';
  this.alertType = 'info';

  this.close = function () {
    this.$uibModalInstance.dismiss();
  };
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
          that.alertType = 'success';
          that.$timeout(function () {
            that.$uibModalInstance.dismiss();
          }, 1500);
        }, function () {
          that.alertType = 'danger';
          that.responseMessage = 'Error leaving group. If last member,' +
            ' delete group.';
        });
      } else {
        that.alertType = 'danger';
        that.responseMessage = 'Error, please log in.';
      }
    })
    .catch(function () {
      that.alertType = 'danger';
      that.responseMessage = 'Error, please try again.';
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
    that.alertType = 'success';
    that.$timeout(function () {
      that.$uibModalInstance.dismiss();
    }, 1500);
  }, function () {
    that.alertType = 'danger';
    that.responseMessage = 'Group could not be deleted.';
  });
};

angular
  .module('refineryCollaboration')
  .controller('GroupEditorCtrl', [
    '$uibModalInstance',
    '$timeout',
    'groupExtendedService',
    'groupMemberService',
    'groupDataService',
    'group',
    'authService',
    'sessionService',
    GroupEditorCtrl
  ]);
