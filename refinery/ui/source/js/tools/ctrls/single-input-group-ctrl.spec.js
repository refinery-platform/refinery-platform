(function () {
  'use strict';
  describe('Controller: Single Input Group Ctrl', function () {
    var ctrl;
    var scope;
    var $controller;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryTools'));
    beforeEach(inject(function (
      $rootScope,
      _$controller_
    ) {
      scope = $rootScope.$new();
      $controller = _$controller_;
      ctrl = $controller('SingleInputGroupCtrl', {
        $scope: scope
      });
    }));

    it('Single Input Group ctrl should exist', function () {
      expect(ctrl).toBeDefined();
    });

    it('Data & UI displays variables should exist for views', function () {
      expect(ctrl.groups).toEqual([]);
      expect(ctrl.groupIndex).toEqual(0);
      expect(ctrl.attributes).toEqual({});
    });

    it('Helper methods are method', function () {
      expect(angular.isFunction(ctrl.navRight)).toBe(true);
      expect(angular.isFunction(ctrl.navLeft)).toBe(true);
      expect(angular.isFunction(ctrl.removeGroup)).toBe(true);
      expect(angular.isFunction(ctrl.removeAllGroups)).toBe(true);
    });
  });
})();
