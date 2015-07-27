function CollaborationCtrl($stateParams, $modal, groupService, groupListService, groupMemberService, groupInviteService) {
  var that = this;
  that.$stateParams = $stateParams;
  that.$modal = $modal;
  that.groupService = groupService;
  that.groupListService = groupListService;
  that.groupMemberService = groupMemberService;
  that.groupInviteService = groupInviteService;

  this.updateGroupList(that.$stateParams);
}

Object.defineProperty(
  CollaborationCtrl.prototype,
  'groupList', {
    enumerable: true,
    configurable: false,
    get: function () {
      return this.groupListService.list;
    }
  }
);

CollaborationCtrl.prototype.updateGroupList = function ($stateParams) {
  var that = this;

  this.groupListService.update()
    .then(function (groupListData) {
      if (groupListData && groupListData instanceof (Array)) {
        // Check to see if acitve group exists in existing group list.
        var accRes  = that.activeGroup ?
          groupListData.reduce(function (a, b) {
            return a.uuid === that.activeGroup.uuid;
          }) : null;

        // Doesn't exist and URL does not specify a target UUID.
        if (!accRes && !$stateParams.uuid) {
          that.setActiveGroup(null);
          that.setActiveGroup(groupListData.length > 0 ?
            groupListData[0] : null);
        } else if (!accRes && $stateParams.uuid) {
          // If no acitve group but uuid present, reduce the list to get a 
          // matching group, if any.
          var reducRes = groupListData.reduce(function (a, b) {
            return a.uuid === $stateParams.uuid ? a : b;
          });

          // If there is a match.
          if (reducRes.uuid === $stateParams.uuid) {
            that.setActiveGroup(reducRes);
          } else {
            that.setActiveGroup(groupListData.length > 0 ?
              groupListData[0] : null);
          }
        } else {
          // No valid group list data nor active groups = no active groups.
          that.setActiveGroup(null);
        }
      } else {
        // No valid group list data = no active groups.
        that.setActiveGroup(null);
      }
    })
    .catch(function (error) {
      console.error(error);
    });
};

CollaborationCtrl.prototype.millisToTime = function (t) {
  return {
    d: Math.floor(t / 86400000),
    h: Math.floor((t % 86400000) / 3600000),
    m: Math.floor(((t % 86400000) % 3600000) / 60000),
    s: Math.floor((((t % 86400000) % 3600000) % 60000) / 1000)
  };
};

CollaborationCtrl.prototype.setActiveGroup = function (group) {
  var that = this;

  if (this.activeGroup) {
    this.activeGroup.active = false;
  }

  if (group) {
    group.active = true;
  }

  this.activeGroup = group;

  if (this.activeGroup) {
    this.groupInviteService.query({
      uuid: this.activeGroup.uuid
    }).$promise.then(
      function (data) {
        that.activeGroupInviteList = data.objects.map(function (i) {
          console.log(i);
          var offset = new Date().getTimezoneOffset() * 60000;
          var createdDate = new Date(new Date(i.created).getTime() + offset);
          var expiresDate = new Date(new Date(i.expires).getTime() + offset);
          var expireTime = that.millisToTime(expiresDate.getTime() - createdDate.getTime());
          console.log(createdDate, expiresDate);
          i.created = humanize.date('D Y-F-dS @ h:m:s A', createdDate);
          i.expires = humanize.date('D Y-F-dS @ h:m:s A', expiresDate);
          i.expireDuration =
            humanize.relativeTime(humanize.time() +
            expireTime.d * 86400 +
            expireTime.h * 3600 +
            expireTime.m * 60 +
            expireTime.s);
          return i;
        });
      }
    ).catch(function (error) {
      console.error(error);
    });
  }
};

// Opening modals:

CollaborationCtrl.prototype.openAddGroup = function () {
  var modalInstance = this.$modal.open({
    templateUrl: '/static/partials/collaboration/partials/collaboration-addgroups-dialog.html',
    controller: 'AddGroupCtrl as modal'
  });
};

CollaborationCtrl.prototype.openGroupEditor = function (group) {
  var modalInstance = this.$modal.open({
    templateUrl: '/static/partials/collaboration/partials/collaboration-groups-dialog.html',
    controller: 'GroupEditorCtrl as modal',
    resolve: {
      config: function () {
        return {
          group: group
        };
      }
    }
  });
};

angular
  .module('refineryCollaboration')
  .controller('refineryCollaborationController', [
    '$stateParams',
    '$modal',
    'groupService',
    'groupListService',
    'groupMemberService',
    'groupInviteService',
    CollaborationCtrl
  ]);