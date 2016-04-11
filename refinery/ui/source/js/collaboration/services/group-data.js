'use strict';

// Wraps groupListService and groupInviteService
function GroupDataService (groupListService, inviteListService) {
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
  var that = this;

  // Make sure that the group list and active group are updated first.
  return this.groupListService.update(params)
    .then(function () {
      that.inviteListService.update();
    });
};

angular
  .module('refineryCollaboration')
  .service('groupDataService', [
    'groupListService', 'inviteListService', GroupDataService
  ]);
