(function () {
  'use strict';

  describe('Controller: Dashboard Main Ctrl', function () {
    var ctrl;
    var scope;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryDashboard'));
    beforeEach(inject(function (
      $rootScope,
      $controller
    ) {
      scope = $rootScope.$new();
      ctrl = $controller('DashboardMainCtrl', {
        $scope: scope
      });
    }));

    it('Dashboard Main ctrl should exist', function () {
      expect(ctrl).toBeDefined();
    });
  });
})();
