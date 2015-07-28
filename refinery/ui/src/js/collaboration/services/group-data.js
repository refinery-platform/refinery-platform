// Wraps groupListService and groupInviteService
function GroupDataService(groupListService, inviteListService) {
  this.groupListService = groupListService;
  this.inviteListService = inviteListService;
}

Object.defineProperty(
  GroupDataService.prototype,
  'groupList', {
    enumerable: true,
    configurable: false,
    get: function () {
      return this.groupListService.list;
    }
  }
);

Object.defineProperty(
  GroupDataService.prototype,
  'activeGroup', {
    enumerable: true,
    configurable: false,
    get: function () {
      return this.groupListService.activeGroup;
    }
  }
);

Object.defineProperty(
  GroupDataService.prototype,
  'inviteList', {
    enumerable: true,
    configurable: false,
    get: function () {
      return this.inviteListService.list;
    }
  }
);

GroupDataService.prototype.update = function (p) {
  var params = p || {};
  this.groupListService.update(params);
  this.inviteListService.update();
};

angular
  .module('refineryCollaboration')
  .service('groupDataService', ['groupListService', 'inviteListService', GroupDataService]);