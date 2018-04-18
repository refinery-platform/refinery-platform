'use strict';

function CollaborationCtrl (
  $timeout,
  $state,
  $stateParams,
  $location,
  bootbox,
  $uibModal,
  activeMemberService,
  groupInviteService,
  groupDataService,
  $window
) {
  this.$state = $state;
  this.$stateParams = $stateParams;
  this.$location = $location;
  this.bootbox = bootbox;
  this.$uibModal = $uibModal;
  this.groupInviteService = groupInviteService;
  this.groupDataService = groupDataService;
  this.activeService = activeMemberService;
  this.$window = $window;

  this.groupDataService.update(this.$stateParams);

  $timeout(window.sizing, 0);
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

CollaborationCtrl.prototype.setActiveGroup = function (group) {
  this.$location.url('/' + group.uuid + '/');
};

CollaborationCtrl.prototype.resendInvitation = function (invite) {
  var that = this;

  this.groupInviteService.resend({
    token: invite.token_uuid
  }).$promise.then(function () {
    that.updateGroupList();
    that.bootbox.alert(
      'Invitation successfully re-sent to ' + invite.recipient_email
    );
  })
  .catch(function () {
    that.bootbox.alert('Invitation sending failed');
  });
};

CollaborationCtrl.prototype.revokeInvitation = function (invite) {
  var that = this;

  this.groupInviteService.revoke({
    token: invite.token_uuid
  })
  .$promise
  .then(function () {
    that.updateGroupList();
    that.bootbox.alert('Invitation revoked from ' + invite.recipient_email);
  })
  .catch(function () {
    that.bootbox.alert('Invitation could not be revoked');
  });
};


// Opening modals:
CollaborationCtrl.prototype.openAddGroup = function () {
  this.$uibModal.open({
    component: 'rpGroupAddModal'
  });
};

CollaborationCtrl.prototype.openGroupEditor = function (group) {
  this.$uibModal.open({
    component: 'rpGroupEditModal',
    resolve: {
      config: function () {
        return {
          group: group
        };
      }
    }
  });
};

CollaborationCtrl.prototype.openMemberEditor = function (member, totalMembers) {
  this.activeService.setActiveMember(member);
  this.activeService.setTotalMembers(totalMembers);
  this.$uibModal.open({
    component: 'rpGroupMemberEditModal',
    resolve: {
      config: function () {
        return {
          activeMember: member,
          activeGroup: this.groupDataService.activeGroup,
          totalMember: totalMembers
        };
      }
    }
  });
};

CollaborationCtrl.prototype.openEmailInvite = function () {
  this.$uibModal.open({
    component: 'rpGroupMemberAddModal',
    resolve: {
      config: function () {
        return {
          activeGroup: this.groupDataService.activeGroup
        };
      }
    }
  });
};

angular
  .module('refineryCollaboration')
  .controller('refineryCollaborationCtrl', [
    '$timeout',
    '$state',
    '$stateParams',
    '$location',
    'bootbox',
    '$uibModal',
    'activeMemberService',
    'groupInviteService',
    'groupDataService',
    '$window',
    CollaborationCtrl
  ]);
