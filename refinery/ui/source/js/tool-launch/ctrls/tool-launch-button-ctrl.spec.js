(function () {
  'use strict';

  describe('Controller: Tool Launch Button Ctrl', function () {
    var ctrl;
    var refinerySettings;
    var scope;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryToolLaunch'));
    beforeEach(inject(function (
      $rootScope,
      $controller,
      settings
    ) {
      scope = $rootScope.$new();
      ctrl = $controller('ToolLaunchButtonCtrl', {
        $scope: scope
      });
      refinerySettings = settings;
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

    it('Sets user is anonymous as true when undefined', function () {
      expect(ctrl.userIsAnonymous).toBe(true);
    });
    it('Sets user is anonymous as false when updating', function () {
      ctrl.$onInit();
      refinerySettings.djangoApp.userId = 5;
      scope.$apply();
      expect(ctrl.userIsAnonymous).toBe(false);
    });
  });
})();
