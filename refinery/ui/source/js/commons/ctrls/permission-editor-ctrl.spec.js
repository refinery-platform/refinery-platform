(function () {
  'use strict';

  describe('Controller: Permission Editor Ctrl', function () {
    var ctrl;
    var fakeUuid;

    beforeEach(module('refineryApp'));
    beforeEach(inject(function (
      $rootScope,
      $componentController,
      mockParamsFactory
    ) {
      ctrl = $componentController(
        'rpPermissionEditorModal',
        { $scope: $rootScope.$new() },
        { resolve: { config: { uuid: mockParamsFactory.generateUuid() } } }
      );
      fakeUuid = mockParamsFactory.generateUuid();
    }));

    it('Permission Editor Ctrl should exist', function () {
      expect(ctrl).toBeDefined();
    });

    it('Permission Level variable to initiate correctly', function () {
      expect(ctrl.permissionLevel.none.read).toEqual(false);
      expect(ctrl.permissionLevel.none.read_meta).toEqual(false);
      expect(ctrl.permissionLevel.none.change).toEqual(false);
      expect(ctrl.permissionLevel.read_meta.read).toEqual(false);
      expect(ctrl.permissionLevel.read_meta.read_meta).toEqual(true);
      expect(ctrl.permissionLevel.read_meta.change).toEqual(false);
      expect(ctrl.permissionLevel.read.read).toEqual(true);
      expect(ctrl.permissionLevel.read.read_meta).toEqual(true);
      expect(ctrl.permissionLevel.read.change).toEqual(false);
      expect(ctrl.permissionLevel.edit.read).toEqual(true);
      expect(ctrl.permissionLevel.edit.read_meta).toEqual(true);
      expect(ctrl.permissionLevel.edit.change).toEqual(true);
    });

    it('close is method', function () {
      expect(angular.isFunction(ctrl.close)).toBe(true);
    });

    describe('updatePerms', function () {
      var apiResponse;
      var spyService;
      var viewGroup;

      beforeEach(inject(function (groupService, $q) {
        apiResponse = {
          id: 5,
          name: 'Public',
          uuid: fakeUuid,
          perm_list: { read: true, read_meta: true, change: false }
        };

        viewGroup = {
          groups: [
            {
              id: 5,
              name: 'Public',
              uuid: fakeUuid,
              permission: 'read'
            }
          ]
        };
        spyService = spyOn(groupService, 'partial_update').and.callFake(function () {
          var deferred = $q.defer();
          deferred.resolve(apiResponse);
          return { $promise: deferred.promise };
        });
      }));

      it('updatePerms is method', function () {
        expect(angular.isFunction(ctrl.updatePerms)).toBe(true);
      });

      it('updatePerms calls on service', function () {
        ctrl.updatePerms(viewGroup);
        expect(spyService).toHaveBeenCalled();
      });
    });
  });
})();
