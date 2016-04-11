'use strict';

function InviteListService (humanize, groupListService, groupInviteService) {
  this.humanize = humanize;
  this.groupListService = groupListService;
  this.groupInviteService = groupInviteService;
}

Object.defineProperty(
  InviteListService.prototype,
  'list', {
    enumerable: true,
    configurable: false,
    value: [],
    writable: true
  }
);

function millisToTime (t) {
  return {
    d: Math.floor(t / 86400000),
    h: Math.floor((t % 86400000) / 3600000),
    m: Math.floor(((t % 86400000) % 3600000) / 60000),
    s: Math.floor((((t % 86400000) % 3600000) % 60000) / 1000)
  };
}

InviteListService.prototype.update = function () {
  if (this.groupListService.activeGroup) {
    return this.groupInviteService.query({
      group_id: this.groupListService.activeGroup.id
    }).$promise.then(function (data) {
      this.list = data.objects.map(function (i) {
        var offset = new Date().getTimezoneOffset() * 60000;
        var createdDate = new Date(new Date(i.created).getTime() + offset);
        var expiresDate = new Date(new Date(i.expires).getTime() + offset);
        var expireTime = millisToTime(expiresDate.getTime() - createdDate.getTime());
        i.created = this.humanize.date('M d @ h:m A', createdDate);
        i.expires = this.humanize.date('M d @ h:m A', expiresDate);
        i.expireDuration = this.humanize.relativeTime(this.humanize.time() +
          expireTime.d * 86400 +
          expireTime.h * 3600 +
          expireTime.m * 60 +
          expireTime.s);
        return i;
      });
    }.bind(this));
  }
  return null;
};

angular
  .module('refineryCollaboration')
  .service('inviteListService', [
    'humanize', 'groupListService', 'groupInviteService', InviteListService
  ]);
