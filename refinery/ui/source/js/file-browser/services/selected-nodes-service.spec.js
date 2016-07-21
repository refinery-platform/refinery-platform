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
    expect(service.selectedNodeUuids).toEqual([]);
    expect(service.selectedNodeUuidsFromNodeGroup).toEqual([]);
    expect(service.selectedAllFlag).toEqual(false);
    expect(service.complementSelectedNodes).toEqual([]);
    expect(service.complementSelectedNodesUuids).toEqual([]);
  });

  it('all methods exist', function () {
    expect(angular.isFunction(service.setSelectedNodes)).toBe(true);
    expect(angular.isFunction(service.setSelectedAllFlags)).toBe(true);
    expect(angular.isFunction(service.setSelectedNodeUuidsFromNodeGroup)).toBe(true);
    expect(angular.isFunction(service.setComplementSeletedNodes)).toBe(true);
  });

  it('setSelectedNodes updates selectedNodes', function () {
    var node = {
      entity: { uuid: 'x508x83x-x9xx-4740-x9x7-x7x0x631280x' },
      isSelected: true
    };
    var nodesUuid = 'x508x83x-x9xx-4740-x9x7-x7x0x631280x';
    expect(service.selectedNodeUuids).toEqual([]);
    expect(service.selectedNodes).toEqual([]);
    service.setSelectedNodes(node);
    expect(service.selectedNodes).toEqual([node]);
    expect(service.selectedNodeUuids).toEqual([nodesUuid]);
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

  it('setSelectedAllFlags', function () {
    service.complementSelectedNodes = [
      { entity: { uuid: 'x5788x83x-x9xx-4740-x9x7-x7x0x98765x' } },
      { entity: { uuid: 'x5788x83x-x9xx-4740-x9x7-x7x0x98765x' } }
    ];
    service.complementSelectedNodesUuids = [
      'x5788x83x-x9xx-4740-x9x7-x7x0x98765x',
      'x5788x83x-x9xx-4740-x9x7-x7x0x98765x'
    ];
    service.setSelectedAllFlags(true);
    expect(service.selectedAllFlag).toEqual(true);
    expect(service.complementSelectedNodes.length).toEqual(2);
    expect(service.complementSelectedNodesUuids.length).toEqual(2);
    service.setSelectedAllFlags(false);
    expect(service.selectedAllFlag).toEqual(false);
    expect(service.complementSelectedNodes).toEqual([]);
    expect(service.complementSelectedNodesUuids).toEqual([]);
  });

  it('setComplementSeletedNodes', function () {
    expect(service.complementSelectedNodes.length).toEqual(0);
    expect(service.complementSelectedNodesUuids.length).toEqual(0);
    // Does not add duplicate uuids
    service.setComplementSeletedNodes({
      entity: { uuid: 'x5788x83x-x9xx-4740-x9x7-x7x0x98765x' },
      isSelected: false
    });
    expect(service.complementSelectedNodes.length).toEqual(1);
    expect(service.complementSelectedNodesUuids.length).toEqual(1);
    service.setComplementSeletedNodes({
      entity: { uuid: 'x7398x83x-x9xx-4740-x9x7-x7x0x98123x' },
      isSelected: false
    });
    expect(service.complementSelectedNodes.length).toEqual(2);
    expect(service.complementSelectedNodesUuids.length).toEqual(2);
  });
});
