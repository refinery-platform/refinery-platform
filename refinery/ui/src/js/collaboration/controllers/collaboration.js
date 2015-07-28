function CollaborationCtrl($stateParams, $modal, groupInviteService, groupDataService) {
  var that = this;
  that.$stateParams = $stateParams;
  that.$modal = $modal;
  that.groupInviteService = groupInviteService;
  that.groupDataService = groupDataService;

  this.groupDataService.update(this.$stateParams); 
}

Object.defineProperty(
  CollaborationCtrl.prototype,
  'groupList', {
    enumerable: true,
    configurable: false,
    get: function () {
      return this.groupDataService.groupList;
    }
  }
);

Object.defineProperty(
  CollaborationCtrl.prototype,
  'activeGroup', {
    enumerable: true,
    configurable: false,
    get: function () {
      return this.groupDataService.activeGroup;
    }
  }
);

Object.defineProperty(
  CollaborationCtrl.prototype,
  'activeGroupInviteList', {
    enumerable: true,
    configurable: false,
    get: function () {
      return this.groupDataService.inviteList;
    }
  }
);

CollaborationCtrl.prototype.updateGroupList = function (params) {
  this.groupDataService.update(params);
};

////////////////////////

CollaborationCtrl.prototype.resendInvitation = function (invite) {
  var that = this;

  this.groupInviteService.resend({
    token: invite.token_uuid
  }).$promise.then(
    function (data) {
      that.updateGroupList();
      bootbox.alert("Invitation successfully re-sent to " + invite.recipient_email);
    }
  ).catch(function (error) {
    console.error(error);
  });
};

CollaborationCtrl.prototype.revokeInvitation = function (invite) {
  var that = this;

  this.groupInviteService.revoke({
    token: invite.token_uuid
  }).$promise.then(
    function (data) {
      that.updateGroupList();
      bootbox.alert("Invitation revoked from " + invite.recipient_email);
    }
  ).catch(function (error) {
    console.error(error);
  });
};


// Opening modals:

CollaborationCtrl.prototype.openAddGroup = function () {
  var that = this;

  var modalInstance = this.$modal.open({
    templateUrl: '/static/partials/collaboration/partials/collaboration-addgroups-dialog.html',
    controller: 'AddGroupCtrl as modal',
  });
};

CollaborationCtrl.prototype.openGroupEditor = function (group) {
  var that = this;

  var modalInstance = this.$modal.open({
    templateUrl: '/static/partials/collaboration/partials/collaboration-groups-dialog.html',
    controller: 'GroupEditorCtrl as modal',
    resolve: {
      group: function () {
        return group;
      }
    }
  });
};

CollaborationCtrl.prototype.openMemberEditor = function (member) {
  var that = this;

  var modalInstance = this.$modal.open({
    templateUrl: '/static/partials/collaboration/partials/collaboration-members-dialog.html',
    controller: 'MemberEditorCtrl as modal',
    resolve: {
      member: function () {
        return member;
      }
    }
  });
};

CollaborationCtrl.prototype.openEmailInvite = function () {
  var that = this;

  var modalInstance = this.$modal.open({
    templateUrl: '/static/partials/collaboration/partials/collaboration-addmembers-dialog.html',
    controller: 'EmailInviteCtrl as modal',
  });
};

angular
  .module('refineryCollaboration')
  .controller('refineryCollaborationController', [
    '$stateParams',
    '$modal',
    'groupInviteService',
    'groupDataService',
    CollaborationCtrl
  ]);