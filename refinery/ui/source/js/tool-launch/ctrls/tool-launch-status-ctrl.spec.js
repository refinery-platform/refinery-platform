(function () {
  'use strict';

  describe('Controller: Tool Launch Status Ctrl', function () {
    var ctrl;
    var mockUuid;
    var scope;
    var service;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryToolLaunch'));
    beforeEach(inject(function (
      $controller,
      $rootScope,
      mockParamsFactory,
      toolLaunchStatusService
    ) {
      scope = $rootScope.$new();
      service = toolLaunchStatusService;
      mockUuid = mockParamsFactory.generateUuid();
      ctrl = $controller('ToolLaunchStatusCtrl', {
        $scope: scope
      });
    }));

    it('Tool Info Display ctrl should exist', function () {
      expect(ctrl).toBeDefined();
    });

    it('Expect view variable should to be initialized to service', function () {
      expect(ctrl.toolLaunches).toEqual(service.toolLaunches);
    });

    it('Expect view method should to be initialized to service', function () {
      expect(angular.isFunction(ctrl.removeToolLaunch)).toBe(true);
    });

    it('RemoveToolLaunch will service to have been called', function () {
      var mockService = spyOn(ctrl, 'removeToolLaunch');
      ctrl.removeToolLaunch(mockUuid);
      expect(mockService).toHaveBeenCalled();
    });
  });
})();
