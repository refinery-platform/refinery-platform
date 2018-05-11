(function () {
  'use strict';

  describe('Tools Params Service', function () {
    var mockUuid;
    var mockToolData;
    var service;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryToolLaunch'));
    beforeEach(inject(function (mockParamsFactory, toolLaunchStatusService) {
      mockUuid = mockParamsFactory.generateUuid();
      mockToolData = {
        uuid: mockUuid,
        tool_type: 'Workflow',
        name: 'HiGlass',
        container_url: 'http://www.fake.com'
      };
      service = toolLaunchStatusService;
    }));

    it('service and variables should exist', function () {
      expect(service).toBeDefined();
      expect(service.toolLaunches).toEqual({});
    });

    describe('addToolLaunchStatus', function () {
      it('addToolLaunchStatus is a method', function () {
        expect(angular.isFunction(service.addToolLaunchStatus)).toBe(true);
      });

      it('addToolLaunchStatus updates tool uuid in the toollaunch obj', function () {
        var toolStatus = 'success';
        expect(service.toolLaunches).toEqual({});
        service.addToolLaunchStatus(mockToolData, toolStatus);
        expect(service.toolLaunches[mockUuid].uuid).toEqual(mockUuid);
      });

      it('addToolLaunchStatus updates name in the toollaunch obj', function () {
        var toolStatus = 'success';
        expect(service.toolLaunches).toEqual({});
        service.addToolLaunchStatus(mockToolData, toolStatus);
        expect(service.toolLaunches[mockUuid].name).toEqual(mockToolData.name);
      });

      it('addToolLaunchStatus updates tool status in the toollaunch obj', function () {
        var toolStatus = 'success';
        expect(service.toolLaunches).toEqual({});
        service.addToolLaunchStatus(mockToolData, toolStatus);
        expect(service.toolLaunches[mockUuid].status).toEqual(toolStatus);
      });

      it('addToolLaunchStatus updates container_url in the toollaunch obj', function () {
        var toolStatus = 'success';
        expect(service.toolLaunches).toEqual({});
        service.addToolLaunchStatus(mockToolData, toolStatus);
        expect(service.toolLaunches[mockUuid].container_url).toEqual(mockToolData.container_url);
      });

      it('addToolLaunchStatus updates tool type in the toollaunch obj', function () {
        var toolStatus = 'success';
        expect(service.toolLaunches).toEqual({});
        service.addToolLaunchStatus(mockToolData, toolStatus);
        expect(service.toolLaunches[mockUuid].type).toEqual(mockToolData.tool_type);
      });
    });

    describe('deleteToolLaunchStatus', function () {
      it('deleteToolLaunchStatus is a method', function () {
        expect(angular.isFunction(service.deleteToolLaunchStatus)).toBe(true);
      });

      it('deleteToolLaunchStatus removes tool', function () {
        angular.copy(service.toolLaunch[mockUuid], mockToolData);
        expect(service.toolLaunches).toEqual({});
        service.deleteToolLaunchStatus(mockUuid, 'success');
        expect(service.toolLaunches[mockUuid].uuid).toEqual(mockUuid);
      });
    });
  });
})();
