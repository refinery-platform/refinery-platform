// Note: be careful to distinguish between groupId, group_id, userId, and user_id.
// camelCase is for JS, while snake_case is for the Python TastyPie API.

angular.module('refineryCollaboration', [])
.controller('refineryCollaborationController', function ($scope, $modal, groupService, groupInviteService, groupMemberService) {
  var that = this;
  var pageScope = $scope;
  that.groupService = groupService;
  that.groupInviteService = groupInviteService;
  that.groupMemberService = groupMemberService;
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

      if (!accRes) {
        pageScope.activeGroup = pageScope.groupList.length > 0 ?
          pageScope.groupList[0] : null;
      } else {
        pageScope.activeGroup = accRes;
      }
    } else {
      pageScope.activeGroup = null;
    }
  });

  // Handles groups.
  pageScope.openGroupEditor = function () {
    var modalInstance = $modal.open({
      templateUrl: '/static/partials/collaboration.groups.modal.html',
      controller: function ($scope, $modalInstance) {
        $scope.groupList = pageScope.groupList;

        $scope.leaveGroup = function (group) {
          console.log(group.group_id);
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
              $modalInstance.dismiss();
              alert("Email successfully sent");
            },
            function (error) {
              console.error(error);
            }
          );
        };
      }
    });
  };
})

.directive('collaborateDisplay', function () {
  return {
    templateUrl: '/static/partials/collaboration.tpls.html',
    restrict: 'A'
  };
});
