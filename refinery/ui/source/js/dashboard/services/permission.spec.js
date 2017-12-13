// UNIT TESTING
'use strict';

describe('Permission Service', function () {
  var deferred;
  var service;
  var fakeUuid = 'x508x83x-x9xx-4740-x9x7-x7x0x631280x';

  beforeEach(module('refineryApp'));
  beforeEach(module('refineryDashboard'));
  beforeEach(inject(function (_permissionService_) {
    service = _permissionService_;
  }));

  it('service and variables should exist', function () {
    expect(service).toBeDefined();
    expect(service.permissions).toEqual({});
  });

  describe('getPermissions', function () {
    var apiResponse;
    var rootScope;
    var expectedPermission;
    beforeEach(inject(function (_sharingService_, $q, _$rootScope_) {
      var sharingService = _sharingService_;
      rootScope = _$rootScope_;
      apiResponse = {
        is_owner: true,
        share_list: [
          {
            group_id: 5,
            group_name: 'Public',
            group_uuid: fakeUuid,
            perms: {
              read: true,
              read_meta: true,
              change: false
            }
          }
        ]
      };
      expectedPermission = {
        isOwner: true,
        groups: [
          {
            id: 5,
            name: 'Public',
            uuid: fakeUuid,
            permission: 'read'
          }
        ]
      };
      spyOn(sharingService, 'get').and.callFake(function () {
        deferred = $q.defer();
        deferred.resolve(apiResponse);
        return { $promise: deferred.promise };
      });
    }));

    it('getPermissions sets permissions', function () {
      service.getPermissions(fakeUuid);
      expect(service.permissions).toEqual({});
      rootScope.$apply();
      expect(service.permissions).toEqual(expectedPermission);
    });
  });

  describe('getPermissionLevel', function () {
    it('getPermissionLevel is a method', function () {
      expect(angular.isFunction(service.getPermissionLevel)).toBe(true);
    });

    it('getPermissionLevel returns a none', function () {
      var response = service.getPermissionLevel({ read_meta: false });
      expect(response).toEqual('none');
    });

    it('getPermissionLevel returns a edit', function () {
      var response = service.getPermissionLevel({ change: true });
      expect(response).toEqual('edit');
    });

    it('getPermissionLevel returns a read', function () {
      var response = service.getPermissionLevel({
        read: true,
        read_meta: true,
        change: false
      });
      expect(response).toEqual('read');
    });
  });
});
