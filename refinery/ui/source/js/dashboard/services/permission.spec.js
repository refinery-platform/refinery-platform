// UNIT TESTING
'use strict';

describe('Permission Service', function () {
  var deferred;
  var service;

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
    beforeEach(inject(function (sharingService, $q) {
      var responseData = { objects: [{ is_owner: true }] };
      spyOn(sharingService, 'query').and.callFake(function () {
        deferred = $q.defer();
        deferred.resolve(responseData);
        return { $promise: deferred.promise };
      });
    }));
  });

  describe('getPermissionLevel', function () {
    it('getPermissionLevel is a method', function () {
      expect(angular.isFunction(service.getPermissionLevel)).toBe(true);
    });

    it('getPermissionLevel returns a none', function () {
      var response = service.getPermissionLevel({ read: false });
      expect(response).toEqual('none');
    });

    it('getPermissionLevel returns a edit', function () {
      var response = service.getPermissionLevel({ change: true });
      expect(response).toEqual('edit');
    });

    it('getPermissionLevel returns a read', function () {
      var response = service.getPermissionLevel({ read: true, change: false });
      expect(response).toEqual('read');
    });
  });
});
