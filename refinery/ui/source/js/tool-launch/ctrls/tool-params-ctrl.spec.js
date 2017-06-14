(function () {
  'use strict';

  describe('Controller: Tool Params Ctrl', function () {
    var ctrl;
    var scope;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryToolLaunch'));
    beforeEach(inject(function (
      $rootScope,
      $controller
    ) {
      scope = $rootScope.$new();
      ctrl = $controller('ToolParamsCtrl', {
        $scope: scope
      });
    }));

    it('Tool Select ctrl should exist', function () {
      expect(ctrl).toBeDefined();
    });

    it('Data & UI displays variables should exist for views', function () {
      expect(ctrl.isToolParamsCollapsed).toEqual(false);
      expect(ctrl.paramsForm).toEqual({});
    });
  });
})();
