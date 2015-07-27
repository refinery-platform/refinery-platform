var collab = angular.module('refineryCollaboration', []);

collab.config(function (refineryStateProvider) {
  refineryStateProvider
    .state(
      'selectedGroup',
      {
        url: '/{uuid}/',
        templateUrl: '/static/partials/collaboration/partials/collaboration-main.html',
        controller: 'refineryCollaborationController as test'
      },
      '/collaboration/')
    .state(
      'defaultGroup',
      {
        url: '/',
        templateUrl: '/static/partials/collaboration/partials/collaboration-main.html',
        controller: 'refineryCollaborationController as test'
      },
      '/collaboration/');
});

function CollaborationCtrl ($scope, $state, $stateParams, $modal, groupService, groupInviteService, groupMemberService, groupListService) {
  var that = this;
  that.scope = $scope;
  that.params = $stateParams;
  that.state = $state;
  that.groupService = groupService;
  that.groupMemberService = groupMemberService;
  that.groupInviteService = groupInviteService;

  this.groupListService = groupListService;

  groupListService.update();
  setTimeout(function () {
    $scope.$digest();
    console.log(that.groupListService, groupListService);
  }, 5000);
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

collab.controller('refineryCollaborationController', CollaborationCtrl);