angular.module('refineryCollaborate', [])
.controller('refineryCollaborateController', function ($scope, $http) {
  $scope.hasNotSelectedOtherResource = true;
  var activeResType = 'Data Set';

  $scope.resourceTypes = ['Data Set', 'Project', 'Workflow'];

  // Update group list.
  $http.get('/api/v1/groups/?format=json').success(function (response) {
    $scope.groupList = response.objects.filter(function (d) {
      return d.group_name.indexOf('.Managers ') !== 0;
    });
  });

  $scope.setGroupActive = function () {
    if ($scope.lastGroupActive) {
      $scope.lastGroupActive.groupActive = '';
    }

    this.groupActive = 'active';
    $scope.lastGroupActive = this;
    updateControlPanel($scope.groupList[this.$index]);

    $scope.isManager = false;

    if ($scope.groupList[this.$index].can_edit) {
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

  function trim(text) {
      console.log("trim called");
      console.log($("#size-test"));
      console.log($("#size-test").parent().width());
  }

  trim("asdfasdfsadf");
  document.trim = trim;
})

.directive('collaborateDisplay', function () {
  return {
    templateUrl: '/static/partials/collaborate.tpls.html',
    restrict: 'A'
  };
});