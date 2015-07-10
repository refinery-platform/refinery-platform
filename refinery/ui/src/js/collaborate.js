angular.module('refineryCollaborate', [])
.controller('refineryCollaborateController', function ($scope, $http, $modal) {
  $scope.hasNotSelectedOtherResource = true;
  var activeGroup = null;

  var activeResType = 'Data Set';

  $scope.resourceTypes = ['Data Set', 'Project', 'Workflow'];

  // Update group list.
  function updateGroupList() {
    $http.get('/api/v1/groups/members/?format=json').success(function (response) {
      $scope.groupList = response.objects.filter(function (d) {
        return d.group_name.indexOf('.Managers ') !== 0;
      });
    });
  }

  updateGroupList();

  $scope.setGroupActive = function () {
    if ($scope.lastGroupActive) {
      $scope.lastGroupActive.groupActive = '';
    }

    this.groupActive = 'active';
    $scope.lastGroupActive = this;
    updateControlPanel(this.group);
    activeGroup = this.group;

    $scope.isManager = false;

    if (this.group.can_edit) {
      $scope.isManager = true;
    }
  }

  $scope.setResourceActive = function () {
    if ($scope.lastResourceActive) {
      $scope.lastResourceActive.resourceActive = '';
    }

    this.resourceActive = 'active';
    $scope.lastResourceActive = this;
    
    if (this.resource === 'Data Set') {
      $scope.activePermList = $scope.datasetPermList;
    }

    if (this.resource === 'Project') {
      $scope.activePermList = $scope.projectPermList;
    }

    if (this.resource === 'Workflow') {
      $scope.activePermList = $scope.workflowPermList;
    }

    $scope.hasNotSelectedOtherResource = false;
    activeResType = this.resource;
  }

  function updateControlPanel(group) {
    // Gets the members.
    $http.get('/api/v1/groups/' + group.group_id + '/members/?format=json').success(function (response) {
      $scope.memberList = response.member_list;
      $scope.isManager = response.can_edit;
    });

    // Gets the permissions.
    $http.get('/api/v1/groups/' + group.group_id + '/perms/?format=json').success(function (response) {
      $scope.datasetPermList = response.perm_list.filter(function (d) {
        return d.type === 'DataSet';
      });

      $scope.projectPermList = response.perm_list.filter(function (d) {
        return d.type === 'Project';
      });

      $scope.workflowPermList = response.perm_list.filter(function (d) {
        return d.type == 'Workflow';
      });

      if (activeResType === 'Data Set') {
        $scope.activePermList = $scope.datasetPermList;
      }

      if (activeResType === 'Project') {
        $scope.activePermList = $scope.projectPermList;
      }

      if (activeResType === 'Workflow') {
        $scope.activePermList = $scope.workflowPermList;
      }
    });
  }

  function clearControlPanel() {
    $scope.memberList = [];
    $scope.datasetPermList = [];
    $scope.projectPermList = [];
    $scope.workflowPermList = [];
  }

  // Handle group existence
  var groupEditorController = function ($scope, $http, $modalInstance, config) {
    $scope.groupList = config.pageScope.groupList;

    $scope.leaveGroup = function (groupId) {
      $http.delete('/api/v1/groups/' + groupId + '/members/' + user_id + '/').success(function (response) {
        updateGroupList();
        $modalInstance.dismiss();
        clearControlPanel();
      });
    }

    $scope.deleteGroup = function (groupId) {
      $http.delete('/api/v1/groups/' + groupId + '/', {}).success(function (response) {
        updateGroupList();
        $modalInstance.dismiss();
        clearControlPanel();
      })
    }

    $scope.createGroup = function (groupName) {
      console.log("Creating new group: " + groupName);

      $http.post('/api/v1/groups/', {
        name: groupName
      }).success(function (response) {
        updateGroupList();
        // updateControlPanel();
        $modalInstance.dismiss();
      })
    }
  };

  $scope.openGroupEditor = function () {
    var modalInstance = $modal.open({
      templateUrl: '/static/partials/collaborate.groups.modal.html',
      controller: groupEditorController,
      resolve: {
        config: function () {
          return {
            pageScope: $scope,
            groupList: $scope.groupList,
            user_id: user_id
          }  
        }
      }
    });
  }

  // Handle member permissions
  var memberEditorController = function ($scope, $http, $modalInstance, config) {
    $scope.member = config.member;

    $scope.promote = function (member) {
      // Assume manager group id is 1 more than regular group's.
      $http.post('/api/v1/groups/' + (activeGroup.manager_group_id) + '/members/', {
        user_id: member.user_id
      }).success(function (response) {
        updateGroupList();
        clearControlPanel();
        updateControlPanel(activeGroup);
        $modalInstance.dismiss();
      });
    }

    $scope.demote = function (member) {
      $http.delete('/api/v1/groups/' + (activeGroup.manager_group_id) +'/members/' + member.user_id).success(function (response) {
        updateGroupList();
        clearControlPanel();
        updateControlPanel(activeGroup);
        $modalInstance.dismiss();
      });
    }

    $scope.remove = function (member) {
      $http.delete('/api/v1/groups/' + (activeGroup.group_id) + '/members/' + member.user_id).success(function (response) {
        updateGroupList();
        clearControlPanel();
        updateControlPanel(activeGroup);
        $modalInstance.dismiss();
      });
    }
  };

  $scope.openMemberEditor = function (member) {
    var modalInstance = $modal.open({
      templateUrl: '/static/partials/collaborate.members.modal.html',
      controller: memberEditorController,
      resolve: {
        config: function () {
          return {
            pageScope: $scope,
            member: member
          };
        }
      }
    });
  }
})

.directive('collaborateDisplay', function () {
  return {
    templateUrl: '/static/partials/collaborate.tpls.html',
    restrict: 'A'
  };
});
