(function () {
  'use strict';

  describe('Controller: Home Control Ctrl', function () {
    var ctrl;
    var scope;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryHome'));
    beforeEach(inject(function (
      $rootScope,
      $controller
    ) {
      scope = $rootScope.$new();
      ctrl = $controller('HomeCtrl', {
        $scope: scope
      });
    }));

    it('HomeCtrl ctrl should exist', function () {
      expect(ctrl).toBeDefined();
    });
  });
})();
