var collab = angular.module('refineryCollaboration', []);

collab.config(function (refineryStateProvider) {
  refineryStateProvider
    .state(
      'selectedGroup',
      {
        url: '/{uuid}/',
        templateUrl: '/static/partials/collaboration/partials/collaboration-main.html',
        controller: 'refineryCollaborationController'
      },
      '/collaboration/')
    .state(
      'defaultGroup',
      {
        url: '/',
        templateUrl: '/static/partials/collaboration/partials/collaboration-main.html',
        controller: 'refineryCollaborationController'
      },
      '/collaboration/');
});

collab.controller('refineryCollaborationController', function ($scope, $state, $stateParams, $modal, groupService, groupInviteService, groupMemberService) {
    var that = this;
  that.scope = $scope;
  that.params = $stateParams;
  that.state = $state;
  that.groupService = groupService;
  that.groupMemberService = groupMemberService;
  that.groupInviteService = groupInviteService;


  this.updateGroupList = function () {
    that.groupMemberService.query().$promise.then(
      function (data) {
        $scope.groupList = data.objects.sort(function (a, b) {
          return a.id > b.id;
        });

        if (that.scope.groupList && that.scope.groupList instanceof (Array)) {
          var accRes = that.scope.activeGroup ?
            that.scope.groupList.reduce(function (a, b) {
              return a.uuid === that.scope.activeGroup.uuid ? a : b;
            }) : null;

          if (!accRes && !that.params.uuid) {
            that.scope.setActiveGroup(that.scope.groupList.length > 0 ?
              that.scope.groupList[0] : null);
          } else if (!accRes && that.params.uuid) {
            var reducRes = that.scope.groupList.reduce(function (a, b) {
              return a.uuid === that.params.uuid ? a : b;
            });

            if (reducRes.uuid === that.params.uuid) {
              that.scope.setActiveGroup(reducRes);
            } else {
              that.scope.setActiveGroup(that.scope.groupList.length > 0 ?
                that.scope.groupList[0] : null);
            }
          } else {
            that.scope.setActiveGroup(accRes);
          }
        } else {
          that.scope.setActiveGroup(null);
        }
      },
      function (error) {
        console.error(error);
      }
    );
  };

  this.updateGroupList();

  this.millisToTime = function (t) {
    return {
      d: Math.floor(t / 86400000),
      h: Math.floor((t % 86400000) / 3600000),
      m: Math.floor(((t % 86400000) % 3600000) / 60000),
      s: Math.floor((((t % 86400000) % 3600000) % 60000) / 1000)
    };
  };

  this.scope.setActiveGroup = function (group) {
    if (that.scope.activeGroup) {
      that.scope.activeGroup.active = false;
    }

    if (group) {
      group.active = true;
    }

    that.scope.activeGroup = group;

    if (that.scope.activeGroup) {
      groupInviteService.query({
        uuid: that.scope.activeGroup.uuid
      }).$promise.then(
        function (data) {
          that.scope.activeGroupInviteList = data.objects.map(function (i) {
            var offset = new Date().getTimezoneOffset() * 60000;
            var createdDate = new Date(new Date(i.created).getTime() + offset);
            var expiresDate = new Date(new Date(i.expires).getTime() + offset);
            var expireTime = that.millisToTime(expiresDate.getTime() - createdDate.getTime());
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
        },
        function (error) {
          console.error(error);
        }
      );
    }
  };

  // Handles groups.
  this.scope.openAddGroup = function () {
    var modalInstance = $modal.open({
      templateUrl: '/static/partials/collaboration/partials/collaboration-addgroups-modal.html',
      controller: function ($scope, $modalInstance) {
        $scope.createGroup = function (name) {
          that.groupService.create({
            name: name
          }).$promise.then(
            function (data) {
              that.updateGroupList();
              $modalInstance.dismiss();
              that.state.go(that.state.current, {}, {reload: true});
            },
            function (error) {
              console.error(error);
            }
          );
        };
      }
    });
  };

  this.scope.openGroupEditor = function (group) {
    var modalInstance = $modal.open({
      templateUrl: '/static/partials/collaboration/partials/collaboration-groups-modal.html',
      controller: function ($scope, $modalInstance) {
        $scope.group = group;

        $scope.leaveGroup = function (group) {
          that.groupMemberService.remove({
            uuid: group.uuid,
            userId: user_id
          }).$promise.then(
            function (data) {
              that.updateGroupList();
              $modalInstance.dismiss();
              that.state.go(that.state.current, {}, {reload: true});
            },
            function (error) {
              console.error(error);
            }
          );
        };

        $scope.deleteGroup = function (group) {
          that.groupService.delete({
            uuid: group.uuid
          }).$promise.then(
            function (data) {
              that.updateGroupList();
              $modalInstance.dismiss();
              that.state.go(that.state.current, {}, {reload: true});
            },
            function (error) {
              console.error(error);
            }
          );
        };
      }
    });
  };

  // Handles membership.
  this.scope.openMemberEditor = function (member) {
    var modalInstance = $modal.open({
      templateUrl: '/static/partials/collaboration/partials/collaboration-members-modal.html',
      controller: function ($scope, $modalInstance) {
        $scope.member = member;

        $scope.promote = function (member) {
          that.groupMemberService.add({
            uuid: that.scope.activeGroup.manager_group_uuid,
            user_id: member.user_id
          }).$promise.then(
            function (data) {
              that.updateGroupList();
              $modalInstance.dismiss();
              that.state.go(that.state.current, {}, {reload: true});
            },
            function (error) {
              console.error(error);
            }
          );
        };

        $scope.demote = function (member) {
          that.groupMemberService.remove({
            uuid: that.scope.activeGroup.manager_group_uuid,
            userId: member.user_id
          }).$promise.then(
            function (data) {
              that.updateGroupList();
              $modalInstance.dismiss();
              that.state.go(that.state.current, {}, {reload: true});
            },
            function (error) {
              console.error(error);
            }
          );
        };

        $scope.remove = function (member) {
          that.groupMemberService.remove({
            uuid: that.scope.activeGroup.uuid,
            userId: member.user_id
          }).$promise.then(
            function (data) {
              that.updateGroupList();
              $modalInstance.dismiss();
              that.state.go(that.state.current, {}, {reload: true});
            },
            function (error) {
              console.error(error);
            }
          );
        };
      }
    });
  };

  this.scope.openEmailInvite = function () {
    var modalInstance = $modal.open({
      templateUrl: '/static/partials/collaboration/partials/collaboration-addmembers-modal.html',
      controller: function ($scope, $modalInstance) {
        $scope.sendInvite = function (email) {
          that.groupInviteService.send({
            group_id: that.scope.activeGroup.id,
            email: email
          }).$promise.then(
            function (data) {
              that.updateGroupList();
              $modalInstance.dismiss();
              that.state.go(that.state.current, {}, {reload: true});
              bootbox.alert("Invitation successfully sent");
            },
            function (error) {
              console.error(error);
            }
          );
        };
      }
    });
  };

  this.scope.revokeInvitation = function (invite) {
    that.groupInviteService.revoke({
      token: invite.token_uuid
    }).$promise.then(
      function (data) {
        that.updateGroupList();
        that.state.go(that.state.current, {}, {reload: true});
        bootbox.alert("Revoked invitation");
      },
      function (error) {
        console.error(error);
      }
    );
  };

  this.scope.resendInvitation = function (invite) {
    that.groupInviteService.resend({
      token: invite.token_uuid
    }).$promise.then(
      function (data) {
        that.updateGroupList();
        that.state.go(that.state.current, {}, {reload: true});
        bootbox.alert("Invitation successfully re-sent");
      },
      function (error) {
        console.error(error);
      }
    );
  };
});