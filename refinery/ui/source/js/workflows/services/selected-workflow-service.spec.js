'use strict';

describe('selected-Workflow-Servicee', function () {
  var service;

  beforeEach(module('refineryApp'));
  beforeEach(module('refineryWorkflows'));
  beforeEach(inject(function (_selectedWorkflowService_) {
    service = _selectedWorkflowService_;
  }));

  it('factory and tools variables should exist', function () {
    expect(service).toBeDefined();
    expect(service.selectedWorkflowList).toEqual([]);
    expect(service.selectedWorkflow).toEqual(service.selectedWorkflowList[0]);
  });

  describe('setSelectedWorkflowList', function () {
    it('setSelectedWorkflowList is a method', function () {
      expect(angular.isFunction(service.setSelectedWorkflowList)).toBe(true);
    });

    it('setSelectedWorkflowList updates selectedWorkflow', function () {
      var workflows = [
        { name: 'WorkFlow1' },
        { name: 'WorkFlow2' },
        { name: 'WorkFlow3' }
      ];
      expect(service.selectedWorkflowList).toEqual([]);
      service.setSelectedWorkflowList(workflows);
      expect(service.selectedWorkflowList).toEqual(workflows);
    });
  });

  describe('setSelectedWorkflow', function () {
    it('setSelectedWorkflow is a method', function () {
      expect(angular.isFunction(service.setSelectedWorkflow)).toBe(true);
    });

    it('setSelectedWorkflow sets selected workflow with a valid workflow', function () {
      var workflow = { name: 'WorkFlow1' };
      expect(service.selectedWorkflow).toEqual(undefined);
      service.setSelectedWorkflow(workflow);
      expect(service.selectedWorkflow).toEqual(workflow);
    });

    it('setSelectedWorkflow does not set empty workflows', function () {
      expect(service.selectedWorkflow).toEqual(undefined);
      service.setSelectedWorkflow({});
      expect(service.selectedWorkflow).toEqual(undefined);
    });
  });
});
