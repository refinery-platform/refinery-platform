(function () {
  'use strict';

  describe('Controller: Main Nav Bar Ctrl', function () {
    var ctrl;
    var scope;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryDataSetNav'));
    beforeEach(inject(function (
      $rootScope,
      $controller
    ) {
      scope = $rootScope.$new();
      ctrl = $controller('MainNavBarCtrl', {
        $scope: scope
      });
    }));

    it('Tool Display ctrl should exist', function () {
      expect(ctrl).toBeDefined();
    });

    it('Data & UI displays variables should exist for views', function () {
      expect(ctrl.path).toEqual('');
      expect(ctrl.isToolSelected).toEqual(false);
    });
  });
})();
