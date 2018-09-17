(function () {
  'use strict';

  describe('Tool Launch Status Service', function () {
    var mockUuid;
    var mockToolData;
    var mockErrorData;
    var service;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryToolLaunch'));
    beforeEach(inject(function (mockParamsFactory, toolLaunchStatusService) {
      mockUuid = mockParamsFactory.generateUuid();
      mockToolData = {
        uuid: mockUuid,
        tool_definition: { tool_type: 'workflow' },
        name: 'HiGlass',
        container_url: 'http://www.fake.com',
        creation_time: Date.now()
      };
      mockErrorData = {
        config: { data: { tool_definition_uuid: mockUuid } },
        status: '500',
        statusText: 'Server Error',
        creation_time: Date.now(),
        data: 'Tool launch failed.'
      };
      service = toolLaunchStatusService;
    }));

    it('service and variables should exist', function () {
      expect(service).toBeDefined();
      expect(service.toolLaunches).toEqual([]);
    });

    describe('addToolLaunchStatus', function () {
      it('addToolLaunchStatus is a method', function () {
        expect(angular.isFunction(service.addToolLaunchStatus)).toBe(true);
      });

      it('addToolLaunchStatus updates tool uuid in the success response', function () {
        var toolStatus = 'success';
        expect(service.toolLaunches).toEqual([]);
        service.addToolLaunchStatus(mockToolData, toolStatus);
        expect(service.toolLaunches[0].uuid).toEqual(mockUuid);
      });

      it('addToolLaunchStatus updates name in the toollaunch success response', function () {
        var toolStatus = 'success';
        expect(service.toolLaunches).toEqual([]);
        service.addToolLaunchStatus(mockToolData, toolStatus);
        expect(service.toolLaunches[0].name).toEqual(mockToolData.name);
      });

      it('addToolLaunchStatus updates tool status in the toollaunch success response', function () {
        var toolStatus = 'success';
        expect(service.toolLaunches).toEqual([]);
        service.addToolLaunchStatus(mockToolData, toolStatus);
        expect(service.toolLaunches[0].status).toEqual(toolStatus);
      });

      it('addToolLaunchStatus updates container_url success response', function () {
        var toolStatus = 'success';
        expect(service.toolLaunches).toEqual([]);
        service.addToolLaunchStatus(mockToolData, toolStatus);
        expect(service.toolLaunches[0].container_url).toEqual(mockToolData.container_url);
      });

      it('addToolLaunchStatus updates tool type in the toollaunch success response', function () {
        var toolStatus = 'success';
        expect(service.toolLaunches).toEqual([]);
        service.addToolLaunchStatus(mockToolData, toolStatus);
        expect(service.toolLaunches[0].type).toEqual(mockToolData.tool_definition.tool_type);
      });

      it('addToolLaunchStatus updates tool uuid in the toollaunch fail response', function () {
        var toolStatus = 'fail';
        expect(service.toolLaunches).toEqual([]);
        service.addToolLaunchStatus(mockErrorData, toolStatus);
        expect(service.toolLaunches[0].uuid).toEqual(mockUuid);
      });

      it('addToolLaunchStatus updates name in the toollaunch fail response', function () {
        var toolStatus = 'fail';
        expect(service.toolLaunches).toEqual([]);
        service.addToolLaunchStatus(mockErrorData, toolStatus);
        expect(service.toolLaunches[0].msg).toEqual('Tool launch failed.');
      });

      it('addToolLaunchStatus updates tool status in the toollaunch fail response', function () {
        var toolStatus = 'fail';
        expect(service.toolLaunches).toEqual([]);
        service.addToolLaunchStatus(mockErrorData, toolStatus);
        expect(service.toolLaunches[0].status).toEqual(toolStatus);
      });

      it('addToolLaunchStatus updates container_url in the toollaunch fail response', function () {
        var toolStatus = 'fail';
        expect(service.toolLaunches).toEqual([]);
        service.addToolLaunchStatus(mockErrorData, toolStatus);
        expect(service.toolLaunches[0].apiStatus).toEqual(mockErrorData.status);
      });

      it('addToolLaunchStatus updates tool type in the toollaunch fail response', function () {
        var toolStatus = 'fail';
        expect(service.toolLaunches).toEqual([]);
        service.addToolLaunchStatus(mockErrorData, toolStatus);
        expect(service.toolLaunches[0].apiStatusMsg).toEqual(mockErrorData.statusText);
      });
    });

    describe('deleteToolLaunchStatus', function () {
      it('deleteToolLaunchStatus is a method', function () {
        expect(angular.isFunction(service.deleteToolLaunchStatus)).toBe(true);
      });

      it('deleteToolLaunchStatus removes tool', function () {
        service.addToolLaunchStatus(mockToolData, 'success');
        expect(service.toolLaunches.length).toEqual(1);
        service.deleteToolLaunchStatus(mockUuid);
        expect(service.toolLaunches.length).toEqual(0);
      });
    });
  });
})();
