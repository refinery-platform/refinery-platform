(function () {
  'use strict';

  describe('Controller: Tool Info Display Ctrl', function () {
    var ctrl;
    var scope;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryToolLaunch'));
    beforeEach(inject(function (
      $rootScope,
      _$controller_
    ) {
      scope = $rootScope.$new();
      ctrl = _$controller_('ToolInfoDisplayCtrl', {
        $scope: scope
      });
    }));

    it('Tool Info Display ctrl should exist', function () {
      expect(ctrl).toBeDefined();
    });

    it('Data & UI displays variables should exist for views', function () {
      expect(ctrl.tool).toEqual({});
      expect(ctrl.isToolInfoCollapsed).toEqual(false);
    });
  });
})();
