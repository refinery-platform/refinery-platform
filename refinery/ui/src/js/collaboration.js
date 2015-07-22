// Note: be careful to distinguish between groupId, group_id, userId, and user_id.
// camelCase is for JS, while snake_case is for the Python TastyPie API.

var collab = angular.module('refineryCollaboration', ['angular-humanize']);

collab.config(function (refineryStateProvider) {
  refineryStateProvider
    .state(
      'selectedGroup',
      {
        url: '/{arg_group_id:int}/',
        templateUrl: '/static/partials/collaboration.tpls.html',
        controller: 'refineryCollaborationController'
      },
      '/collaboration/')
    .state(
      'defaultGroup',
      {
        url: '/',
        templateUrl: '/static/partials/collaboration.tpls.html',
        controller: 'refineryCollaborationController'
      },
      '/collaboration/')
    .state(
      'badGroup',
      {
        url: '/{random}/',
        templateUrl:' /static/partials/collaboration.tpls.html',
        controller: 'refineryCollaborationController'
      },
      '/collaboration/');
});

collab.controller('refineryCollaborationController', function ($scope, $state, $stateParams, $modal, groupService, groupInviteService, groupMemberService) {
  var that = this;
  var pageScope = $scope;
  that.groupService = groupService;
  that.groupInviteService = groupInviteService;
  that.groupMemberService = groupMemberService;
  that.stateParams = $stateParams;
  updateGroupList();

  function updateGroupList() {
    groupMemberService.query().$promise.then(
      function (data) {
        pageScope.groupList = data.objects.filter(function (g) {
          return g.group_name.indexOf('.Managers') !== 0;
        }).sort(function (a, b) {
          return a.group_id > b.group_id;
        });
      },
      function (error) {
        console.error(error);
      }
    );
  }

  pageScope.setGroupActive = function (group) {
    pageScope.activeGroup = group;
  };

  pageScope.$watch('groupList', function () {
    if (pageScope.groupList && pageScope.groupList instanceof(Array)) {
      var accRes = pageScope.activeGroup ? 
        pageScope.groupList.reduce(function (a, b) {
          return a.group_id === pageScope.activeGroup.group_id ? a : b;
        }) : null;

      if (!accRes && !that.stateParams.arg_group_id) {
        pageScope.activeGroup = pageScope.groupList.length > 0 ?
          pageScope.groupList[0] : null;
      } else if (!accRes && that.stateParams.arg_group_id) {
        var reducedDefault = pageScope.groupList.reduce(function (a, b) {
          return a.group_id === that.stateParams.arg_group_id ? a : b;
        });

        if (reducedDefault.group_id === that.stateParams.arg_group_id) {
          pageScope.activeGroup = reducedDefault;
        } else {
          pageScope.activeGroup = pageScope.groupList.length > 0 ?
            pageScope.groupList[0] : null;
        }
      } else {
        pageScope.activeGroup = accRes;
      }
    } else {
      pageScope.activeGroup = null;
    }
  });

  pageScope.$watch('activeGroup', function () {
    if (pageScope.activeGroup) {
      groupInviteService.query({
        group_id: pageScope.activeGroup.group_id
      }).$promise.then(
        function (data) {
          pageScope.activeGroupInviteList = data.objects.map(function (i) {
            i.created = humanize.date('D Y-F-dS @ h:m:s A', new Date(i.created));
            i.expires = humanize.date('D Y-F-dS @ h:m:s A', new Date(i.expires));
            return i;
          });
        },
        function (error) {
          console.error(error);
        }
      );
    }
  });

  // Handles groups.
  pageScope.openGroupEditor = function () {
    var modalInstance = $modal.open({
      templateUrl: '/static/partials/collaboration.groups.modal.html',
      controller: function ($scope, $modalInstance) {
        $scope.groupList = pageScope.groupList;

        $scope.leaveGroup = function (group) {
          that.groupMemberService.remove({
            groupId: group.group_id,
            userId: user_id
          }).$promise.then(
            function (data) {
              updateGroupList();
              $modalInstance.dismiss();
            },
            function (error) {
              console.error(error);
            }
          );
        };

        $scope.deleteGroup = function (group) {
          that.groupService.delete({
            groupId: group.group_id
          }).$promise.then(
            function (data) {
              updateGroupList();
              $modalInstance.dismiss();
            },
            function (error) {
              console.error(error);
            }
          );
        };

        $scope.createGroup = function (name) {
          that.groupService.create({
            name: name
          }).$promise.then(
            function (data) {
              updateGroupList();
              $modalInstance.dismiss();
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
  pageScope.openMemberEditor = function (member) {
    var modalInstance = $modal.open({
      templateUrl: '/static/partials/collaboration.members.modal.html',
      controller: function ($scope, $modalInstance) {
        $scope.member = member;

        $scope.promote = function (member) {
          that.groupMemberService.add({
            groupId: pageScope.activeGroup.manager_group_id,
            user_id: member.user_id
          }).$promise.then(
            function (data) {
              updateGroupList();
              $modalInstance.dismiss();
            },
            function (error) {
              console.error(error);
            }
          );
        };

        $scope.demote = function (member) {
          that.groupMemberService.remove({
            groupId: pageScope.activeGroup.manager_group_id,
            userId: member.user_id
          }).$promise.then(
            function (data) {
              updateGroupList();
              $modalInstance.dismiss();
            },
            function (error) {
              console.error(error);
            }
          );
        };

        $scope.remove = function (member) {
          that.groupMemberService.remove({
            groupId: pageScope.activeGroup.group_id,
            userId: member.user_id
          }).$promise.then(
            function (data) {
              updateGroupList();
              $modalInstance.dismiss();
            },
            function (error) {
              console.error(error);
            }
          );
        };
      }
    });
  };

  pageScope.openEmailInvite = function () {
    var modalInstance = $modal.open({
      templateUrl: '/static/partials/collaboration.addmembers.modal.html',
      controller: function ($scope, $modalInstance) {
        $scope.sendInvite = function (email) {
          that.groupInviteService.send({
            group_id: pageScope.activeGroup.group_id,
            email: email
          }).$promise.then(
            function (data) {
              updateGroupList();
              $modalInstance.dismiss();
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

  pageScope.revokeInvitation = function (invite) {
    that.groupInviteService.revoke({
      token: invite.token_uuid
    }).$promise.then(
      function (data) {
        updateGroupList();
        bootbox.alert("Revoked invitation");
      },
      function (error) {
        console.error(error);
      }
    );
  };

  pageScope.resendInvitation = function (invite) {
    that.groupInviteService.resend({
      token: invite.token_uuid
    }).$promise.then(
      function (data) {
        updateGroupList();
        bootbox.alert("Invitation successfully re-sent");
      },
      function (error) {
        console.error(error);
      }
    );
  };
});
