'use strict';

describe('Selected-Node-Group-Service', function () {
  var service;

  beforeEach(module('refineryApp'));
  beforeEach(module('refineryFileBrowser'));
  beforeEach(inject(function (_selectedNodeGroupService_) {
    service = _selectedNodeGroupService_;
  }));

  it('service variables should exist', function () {
    expect(service).toBeDefined();
    expect(service.selectedNodeGroup).toEqual({});
  });

  it('all methods exist', function () {
    expect(angular.isFunction(service.setSelectedNodeGroup)).toBe(true);
  });

  it('setSelectedNodeGroup handles blank values', function () {
    var response = service.setSelectedNodeGroup({});
    expect(response).toEqual({});
  });

  it('setSelectedNodeGroup handles duplicate values', function () {
    var inputSelectNodeGroup = { name: 'Current Selection' };
    service.selectedNodeGroup = { name: 'Current Selection' };
    var response = service.setSelectedNodeGroup(inputSelectNodeGroup);
    expect(response.name).toEqual(service.selectedNodeGroup.name);
  });

  it('setSelectedNodeGroup handles new values', function () {
    var inputSelectNodeGroup = { name: 'Node Group 1' };
    service.selectedNodeGroup = { name: 'Current Selection' };
    var response = service.setSelectedNodeGroup(inputSelectNodeGroup);
    expect(response.name).toEqual(inputSelectNodeGroup.name);
  });
});
