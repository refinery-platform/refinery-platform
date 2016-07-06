'use strict';

describe('Selected-Nodes-Service', function () {
  var service;

  beforeEach(module('refineryApp'));
  beforeEach(module('refineryFileBrowser'));
  beforeEach(inject(function (_selectedNodesService_) {
    service = _selectedNodesService_;
  }));

  it('service variables should exist', function () {
    expect(service).toBeDefined();
    expect(service.selectedNodes).toEqual([]);
    expect(service.selectedNodeUuidsFromUI).toEqual([]);
    expect(service.selectedNodeUuidsFromNodeGroup).toEqual([]);
  });

  it('all methods exist', function () {
    expect(angular.isFunction(service.setSelectedNodes)).toBe(true);
    expect(angular.isFunction(service.setSelectedNodeUuidsFromUI)).toBe(true);
    expect(angular.isFunction(service.setSelectedNodeUuidsFromNodeGroup)).toBe(true);
    expect(angular.isFunction(service.getUuidsFromSelectedNodesInUI)).toBe(true);
  });

  it('setSelectedNodes updates selectedNodes', function () {
    var nodesList = [
      { uuid: 'x508x83x-x9xx-4740-x9x7-x7x0x631280x' },
      { uuid: 'x5788x83x-x9xx-4740-x9x7-x7x0x98765x' }
    ];
    expect(service.selectedNodes).toEqual([]);
    service.setSelectedNodes(nodesList);
    expect(service.selectedNodes).toEqual(nodesList);
  });

  it('setSelectedNodeUuidsFromUI updates selectedNodeUuidsFromUI', function () {
    var nodesList = [
      'x508x83x-x9xx-4740-x9x7-x7x0x631280x',
      'x5788x83x-x9xx-4740-x9x7-x7x0x98765x'
    ];
    expect(service.selectedNodeUuidsFromUI).toEqual([]);
    service.setSelectedNodeUuidsFromUI(nodesList);
    expect(service.selectedNodeUuidsFromUI).toEqual(nodesList);
  });

  it('setSelectedNodeUuidsFromNodeGroup updates selectedNodeUuidsFromNodeGroup', function () {
    var nodesList = [
      'x508x83x-x9xx-4740-x9x7-x7x0x631280x',
      'x5788x83x-x9xx-4740-x9x7-x7x0x98765x'
    ];
    expect(service.selectedNodeUuidsFromNodeGroup).toEqual([]);
    service.setSelectedNodeUuidsFromNodeGroup(nodesList);
    expect(service.selectedNodeUuidsFromNodeGroup).toEqual(nodesList);
  });

  it('getUuidsFromSelectedNodesInUI calls on setSelectedNodeUuidsFromUi', function () {
    service.selectedNodes = [
      'x508x83x-x9xx-4740-x9x7-x7x0x631280x',
      'x5788x83x-x9xx-4740-x9x7-x7x0x98765x'
    ];
    spyOn(service, 'setSelectedNodeUuidsFromUI');
    expect(service.setSelectedNodeUuidsFromUI).not.toHaveBeenCalled();
    service.getUuidsFromSelectedNodesInUI();
    expect(service.setSelectedNodeUuidsFromUI).toHaveBeenCalled();
  });
});
