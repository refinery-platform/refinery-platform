'use strict';

describe('Selected-Nodes-Service', function () {
  var service;

  beforeEach(module('refineryApp'));
  beforeEach(module('refineryFileBrowser'));
  beforeEach(inject(function (_selectedNodesService_, $window) {
    service = _selectedNodesService_;
    $window.externalAssayUuid = '8486046b-22f4-447f-9c81-41dbf6173c44';
    $window.externalStudyUuid = '2341568b-22f4-643f-9c76-32dbf6173d66';
  }));

  it('service variables should exist', function () {
    expect(service).toBeDefined();
    expect(service.selectedNodes).toEqual([]);
    expect(service.selectedNodesUuids).toEqual([]);
    expect(service.selectedNodesUuidsFromNodeGroup).toEqual([]);
    expect(service.selectedAllFlag).toEqual(false);
    expect(service.complementSelectedNodes).toEqual([]);
    expect(service.selectedNodeGroupUuid).toEqual('');
    expect(service.defaultCurrentSelectionUuid).toEqual('');
    expect(service.resetNodeGroup).toEqual(false);
  });

  it('all methods exist', function () {
    expect(angular.isFunction(service.setSelectedNodes)).toBe(true);
    expect(angular.isFunction(service.setSelectedNodesUuidsFromNodeGroup)).toBe(true);
    expect(angular.isFunction(service.setSelectedNodesFromNodeGroup)).toBe(true);
    expect(angular.isFunction(service.setSelectedAllFlags)).toBe(true);
    expect(angular.isFunction(service.setComplementSeletedNodes)).toBe(true);
    expect(angular.isFunction(service.resetNodeGroupSelection)).toBe(true);
    expect(angular.isFunction(service.getNodeGroupParams)).toBe(true);
  });

  it('setSelectedNodes updates selectedNodes', function () {
    var node = {
      entity: { uuid: 'x508x83x-x9xx-4740-x9x7-x7x0x631280x' },
      isSelected: true
    };
    var nodesUuid = 'x508x83x-x9xx-4740-x9x7-x7x0x631280x';
    expect(service.selectedNodesUuids).toEqual([]);
    expect(service.selectedNodes).toEqual([]);
    service.setSelectedNodes(node);
    expect(service.selectedNodes).toEqual([node]);
    expect(service.selectedNodesUuids).toEqual([nodesUuid]);
  });

  it('setSelectedNodesUuidsFromNodeGroup updates' +
    ' selectedNodesUuidsFromNodeGroup', function () {
    var nodesList = [
      'x508x83x-x9xx-4740-x9x7-x7x0x631280x',
      'x5788x83x-x9xx-4740-x9x7-x7x0x98765x'
    ];
    expect(service.selectedNodesUuidsFromNodeGroup).toEqual([]);
    service.setSelectedNodesUuidsFromNodeGroup(nodesList);
    expect(service.selectedNodesUuidsFromNodeGroup).toEqual(nodesList);
  });

  it('setSelectedNodesFromNodeGroup calls on setSelectedNode', function () {
    var uuidList = ['x5788x83x-x9xx-4740-x9x7-x7x0x98765x'];

    spyOn(service, 'setSelectedNodes');
    var expectedParam = {
      entity: {
        uuid: 'x5788x83x-x9xx-4740-x9x7-x7x0x98765x'
      },
      isSelected: true
    };
    expect(service.setSelectedNodes).not.toHaveBeenCalled();
    service.setSelectedNodesFromNodeGroup(uuidList);
    expect(service.setSelectedNodes).toHaveBeenCalledWith(expectedParam);
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

  it('resetNodeGroupSelection to true flag', function () {
    expect(service.selectedNodeGroupUuid).toEqual('');
    service.defaultCurrentSelectionUuid = 'x5788x83x-x9xx-4740-x9x7-x7x0x98765x';
    service.resetNodeGroupSelection(true);
    expect(service.selectedNodeGroupUuid).toEqual(service.defaultCurrentSelectionUuid);
    expect(service.resetNodeGroup).toEqual(true);
    service.resetNodeGroupSelection(false);
    expect(service.resetNodeGroup).toEqual(false);
  });

  it('resetNodeGroupSelection to false flag', function () {
    expect(service.selectedNodeGroupUuid).toEqual('');
    service.defaultCurrentSelectionUuid = 'x5788x83x-x9xx-4740-x9x7-x7x0x98765x';
    service.resetNodeGroupSelection(false);
    expect(service.selectedNodeGroupUuid).toEqual('');
    expect(service.resetNodeGroup).toEqual(false);
  });

  it('getNodeGroupParams sets correct complement nodes params', function () {
    service.selectedAllFlag = true;
    service.selectedNodeGroupUuid = 'x508x83x-x9xx-4740-x9x7-x7x0x631280x';
    service.complementSelectedNodesUuids = ['x5788x83x-x9xx-4740-x9x7-x7x0x98765x'];

    var response = service.getNodeGroupParams();
    expect(response.uuid).toEqual(service.selectedNodeGroupUuid);
    expect(response.nodes).toEqual(service.complementSelectedNodesUuids);
    expect(response.use_complement_nodes).toEqual(true);
  });

  it('getNodeGroupParams sets correct selected nodes params', function () {
    service.selectedAllFlag = false;
    service.selectedNodeGroupUuid = 'x508x83x-x9xx-4740-x9x7-x7x0x631280x';
    service.selectedNodesUuids = ['db03efb7-cf01-4840-bcb2-7b023efc290c'];

    var response = service.getNodeGroupParams();
    expect(response.uuid).toEqual(service.selectedNodeGroupUuid);
    expect(response.nodes).toEqual(service.selectedNodesUuids);
    expect(response.use_complement_nodes).toEqual(false);
  });
});
