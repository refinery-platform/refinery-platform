(function () {
  'use strict';

  describe('Controller: Tool Launch Button Ctrl', function () {
    var ctrl;
    var scope;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryToolLaunch'));
    beforeEach(inject(function (
      $rootScope,
      $controller
    ) {
      scope = $rootScope.$new();
      ctrl = $controller('ToolLaunchButtonCtrl', {
        $scope: scope
      });
    }));

    it('Tool Info Display ctrl should exist', function () {
      expect(ctrl).toBeDefined();
    });

    it('Expect method should exist for views', function () {
      expect(angular.isFunction(ctrl.launchTool)).toBe(true);
    });

    it('Validation method should exist for views', function () {
      expect(angular.isFunction(ctrl.needMoreNodes)).toBe(true);
    });
  });
})();
