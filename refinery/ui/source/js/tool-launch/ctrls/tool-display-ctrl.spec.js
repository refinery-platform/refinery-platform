(function () {
  'use strict';

  describe('Controller: Tool Display Ctrl', function () {
    var ctrl;
    var scope;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryToolLaunch'));
    beforeEach(inject(function (
      $rootScope,
      $controller
    ) {
      scope = $rootScope.$new();
      ctrl = $controller('ToolDisplayCtrl', {
        $scope: scope
      });
    }));

    it('Tool Display ctrl should exist', function () {
      expect(ctrl).toBeDefined();
    });

    it('Data & UI displays variables should exist for views', function () {
      expect(ctrl.selectedTool).toEqual({});
      expect(ctrl.isToolSelected).toEqual(false);
    });
  });
})();
