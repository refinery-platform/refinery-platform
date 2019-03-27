(function () {
  'use strict';

  describe('Permission Service', function () {
    var deferred;
    var fakeUuid;
    var service;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryDashboard'));
    beforeEach(inject(function (mockParamsFactory, permissionService) {
      service = permissionService;
      fakeUuid = mockParamsFactory.generateUuid();
    }));

    it('service and variables should exist', function () {
      expect(service).toBeDefined();
      expect(service.permissions).toEqual({});
    });

    describe('getPermissions', function () {
      var apiResponse;
      var rootScope;
      var expectedPermission;
      beforeEach(inject(function (groupService, $q, _$rootScope_) {
        var apiService = groupService;
        rootScope = _$rootScope_;
        apiResponse = [
          {
            id: 5,
            name: 'Public',
            uuid: fakeUuid,
            perm_list: { read: true, read_meta: true, change: false }
          }
        ];

        expectedPermission = {
          groups: [
            {
              id: 5,
              name: 'Public',
              uuid: fakeUuid,
              permission: 'read'
            }
          ]
        };
        spyOn(apiService, 'query').and.callFake(function () {
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
})();
