(function () {
  'use strict';

  describe('Controller: Tool Launch Name Ctrl', function () {
    var ctrl;
    var scope;
    var service;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryToolLaunch'));
    beforeEach(inject(function (
      $rootScope,
      $controller,
      toolParamsService
    ) {
      scope = $rootScope.$new();
      ctrl = $controller('ToolLaunchNameCtrl', {
        $scope: scope
      });
      service = toolParamsService;
    }));

    it('Tool Select ctrl should exist', function () {
      expect(ctrl).toBeDefined();
    });

    it('Data & UI displays variables should exist for views', function () {
      expect(ctrl.form.name).toEqual('');
      expect(ctrl.selectedTool).toEqual({});
      expect(ctrl.toolType).toEqual('');
    });

    it('updateToolLaunchName is a method', function () {
      expect(angular.isFunction(ctrl.updateToolLaunchName)).toBe(true);
    });

    it('updateToolLaunchName updates correct service', function () {
      var testName = 'Tool Launch Name';
      expect(service.toolEditForm.display_name).toEqual('');
      ctrl.updateToolLaunchName(testName);
      expect(service.toolEditForm.display_name).toEqual(testName);
    });
  });
})();
