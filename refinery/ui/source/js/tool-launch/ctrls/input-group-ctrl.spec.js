(function () {
  'use strict';

  describe('Controller: Input Group Ctrl', function () {
    var ctrl;
    var scope;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryToolLaunch'));
    beforeEach(inject(function (
      $rootScope,
      $controller
    ) {
      scope = $rootScope.$new();
      ctrl = $controller('InputGroupCtrl', {
        $scope: scope
      });
    }));

    it('Input Group ctrl should exist', function () {
      expect(ctrl).toBeDefined();
    });

    it('Data & UI displays variables should exist for views', function () {
      expect(ctrl.tool).toEqual({});
      expect(ctrl.toolType).toEqual('');
      expect(ctrl.isNavCollapsed).toEqual(false);
    });
  });
})();
