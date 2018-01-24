(function () {
  'use strict';

  describe('Controller: Permission Editor Ctrl', function () {
    var ctrl;

    beforeEach(module('refineryApp'));
    beforeEach(inject(function (
      $rootScope,
      $controller
    ) {
      ctrl = $controller('PermissionEditorCtrl', {
        $scope: $rootScope.$new(),
      });
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

    it('cancel is method', function () {
      expect(angular.isFunction(ctrl.cancel)).toBe(true);
    });

    it('save is method', function () {
      expect(angular.isFunction(ctrl.cancel)).toBe(true);
    });
  });
})();
