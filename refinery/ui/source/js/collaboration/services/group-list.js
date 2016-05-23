'use strict';

function GroupListService (groupMemberService) {
  this.groupMemberService = groupMemberService;
}

function getGroup (group, list) {
  if (group && list.length > 1) {
    var r = list.reduce(function (a, b) {
      return a.uuid === group.uuid ? a : b;
    });

    return r.uuid === group.uuid ? r : null;
  }
  return null;
}

Object.defineProperty(
  GroupListService.prototype,
  'list', {
    enumerable: true,
    configurable: false,
    value: [],
    writable: true
  }
);

Object.defineProperty(
  GroupListService.prototype,
  'activeGroup', {
    enumerable: true,
    configurable: false,
    get: function () {
      return this._activeGroup;
    },
    set: function (group) {
      if (this._activeGroup) {
        this._activeGroup.active = false;
      }

      if (group) {
        group.active = true;
      }

      this._activeGroup = group;
    }
  }
);

GroupListService.prototype.update = function (p) {
  var params = p || {};

  return this.groupMemberService.query()
    .$promise.then(function (data) {
      this.list = data.objects.sort(function (a, b) {
        return a.id > b.id;
      });

      var a = getGroup(this.activeGroup, this.list);
      var b = getGroup({
        uuid: params.uuid
      }, this.list);

      // URL params' uuid takes precedence over current active groups.
      if (a && !b) {
        this.activeGroup = a;
      } else if (b) {
        this.activeGroup = b;
      } else {
        this.activeGroup = this.list.length > 0 ? this.list[0] : null;
      }

      return this.list;
    }.bind(this));
};

angular
  .module('refineryCollaboration')
  .service('groupListService', ['groupMemberService', GroupListService]);
