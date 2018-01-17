(function () {
  'use strict';

  describe('Controller: Provvis Main Ctrl', function () {
    var ctrl;
    var scope;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryProvvis'));
    beforeEach(inject(function (
      $rootScope,
      $controller
    ) {
      scope = $rootScope.$new();
      ctrl = $controller('ProvvisController', {
        $scope: scope
      });
    }));

    it('refineryProvvis ctrl should exist', function () {
      expect(ctrl).toBeDefined();
    });

    it('Data & UI displays variables should exist for views', function () {
      expect(ctrl.isGraphReady).toEqual(false);
    });
  });
})();
