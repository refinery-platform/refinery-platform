(function () {
  'use strict';

  describe('Controller: Provvis Canvas Ctrl', function () {
    var ctrl;
    var scope;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryProvvis'));
    beforeEach(inject(function (
      $rootScope,
      $controller
    ) {
      scope = $rootScope.$new();
      ctrl = $controller('provvisCanvasController', {
        $scope: scope
      });
    }));

    it('Tool Display ctrl should exist', function () {
      expect(ctrl).toBeDefined();
    });

    it('Data & UI displays variables should exist for views', function () {
      expect(scope.name).toEqual('Canvas');
    });
  });
})();
