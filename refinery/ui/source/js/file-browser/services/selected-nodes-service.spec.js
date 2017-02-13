'use strict';

describe('Selected-Nodes-Service', function () {
  var service;
  var mocker;

  beforeEach(module('refineryApp'));
  beforeEach(module('refineryFileBrowser'));
  beforeEach(inject(function (
    _selectedNodesService_,
    _mockParamsFactory_,
    $window
  ) {
    service = _selectedNodesService_;
    mocker = _mockParamsFactory_;
    $window.externalAssayUuid = mocker.generateUuid();
    $window.externalStudyUuid = mocker.generateUuid();
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
    expect(angular.isFunction(service.isNodeSelectionEmpty)).toBe(true);
  });

  it('setSelectedNodes updates selectedNodes', function () {
    var node = {
      entity: { uuid: mocker.generateUuid() },
      isSelected: true
    };
    var nodesUuid = node.entity.uuid;
    expect(service.selectedNodesUuids).toEqual([]);
    expect(service.selectedNodes).toEqual([]);
    service.setSelectedNodes(node);
    expect(service.selectedNodes).toEqual([node]);
    expect(service.selectedNodesUuids).toEqual([nodesUuid]);
  });

  it('setSelectedNodesUuidsFromNodeGroup updates' +
    ' selectedNodesUuidsFromNodeGroup', function () {
    var nodesList = [
      mocker.generateUuid(),
      mocker.generateUuid()
    ];
    expect(service.selectedNodesUuidsFromNodeGroup).toEqual([]);
    service.setSelectedNodesUuidsFromNodeGroup(nodesList);
    expect(service.selectedNodesUuidsFromNodeGroup).toEqual(nodesList);
  });

  it('setSelectedNodesFromNodeGroup calls on setSelectedNode', function () {
    var uuidList = [mocker.generateUuid()];

    spyOn(service, 'setSelectedNodes');
    var expectedParam = {
      entity: {
        uuid: uuidList[0]
      },
      isSelected: true
    };
    expect(service.setSelectedNodes).not.toHaveBeenCalled();
    service.setSelectedNodesFromNodeGroup(uuidList);
    expect(service.setSelectedNodes).toHaveBeenCalledWith(expectedParam);
  });

  it('setSelectedAllFlags', function () {
    service.complementSelectedNodes = [
      { entity: { uuid: mocker.generateUuid() } },
      { entity: { uuid: mocker.generateUuid() } }
    ];
    service.complementSelectedNodesUuids = [
      mocker.generateUuid(),
      mocker.generateUuid()
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
      entity: { uuid: mocker.generateUuid() },
      isSelected: false
    });
    expect(service.complementSelectedNodes.length).toEqual(1);
    expect(service.complementSelectedNodesUuids.length).toEqual(1);
    service.setComplementSeletedNodes({
      entity: { uuid: mocker.generateUuid() },
      isSelected: false
    });
    expect(service.complementSelectedNodes.length).toEqual(2);
    expect(service.complementSelectedNodesUuids.length).toEqual(2);
  });

  describe('resetNodeGroupSelection, helper method', function () {
    it('resetNodeGroupSelection to true flag', function () {
      expect(service.selectedNodeGroupUuid).toEqual('');
      service.defaultCurrentSelectionUuid = mocker.generateUuid();
      service.resetNodeGroupSelection(true);
      expect(service.selectedNodeGroupUuid).toEqual(service.defaultCurrentSelectionUuid);
      expect(service.resetNodeGroup).toEqual(true);
      service.resetNodeGroupSelection(false);
      expect(service.resetNodeGroup).toEqual(false);
    });

    it('resetNodeGroupSelection to false flag', function () {
      expect(service.selectedNodeGroupUuid).toEqual('');
      service.defaultCurrentSelectionUuid = mocker.generateUuid();
      service.resetNodeGroupSelection(false);
      expect(service.selectedNodeGroupUuid).toEqual('');
      expect(service.resetNodeGroup).toEqual(false);
    });
  });

  describe('getNodeGroupParams', function () {
    it('getNodeGroupParams sets correct complement nodes params', function () {
      service.selectedAllFlag = true;
      service.selectedNodeGroupUuid = mocker.generateUuid();
      service.complementSelectedNodesUuids = [mocker.generateUuid()];

      var response = service.getNodeGroupParams();
      expect(response.uuid).toEqual(service.selectedNodeGroupUuid);
      expect(response.nodes).toEqual(service.complementSelectedNodesUuids);
      expect(response.use_complement_nodes).toEqual(true);
    });

    it('getNodeGroupParams sets correct selected nodes params', function () {
      service.selectedAllFlag = false;
      service.selectedNodeGroupUuid = mocker.generateUuid();
      service.selectedNodesUuids = [mocker.generateUuid()];

      var response = service.getNodeGroupParams();
      expect(response.uuid).toEqual(service.selectedNodeGroupUuid);
      expect(response.nodes).toEqual(service.selectedNodesUuids);
      expect(response.use_complement_nodes).toEqual(false);
    });
  });

  describe('isNodeSelectionEmpty, helper method', function () {
    it('isNodeSelectionEmpty returns true', function () {
      spyOn(service, 'getNodeGroupParams').and.returnValue({
        nodes: [],
        use_complement_nodes: false
      });

      var response = service.isNodeSelectionEmpty();
      expect(response).toEqual(true);
    });

    it('isNodeSelectionEmpty returns false when nodes are selected', function () {
      spyOn(service, 'getNodeGroupParams').and.returnValue({
        nodes: [
          mocker.generateUuid(),
          mocker.generateUuid()
        ],
        use_complement_nodes: false
      });

      var response = service.isNodeSelectionEmpty();
      expect(response).toEqual(false);
    });

    it('isNodeSelectionEmpty returns false with when select all', function () {
      spyOn(service, 'getNodeGroupParams').and.returnValue({
        nodes: [],
        use_complement_nodes: true
      });

      var response = service.isNodeSelectionEmpty();
      expect(response).toEqual(false);
    });

    it('isNodeSelectionEmpty returns false with when both values are', function () {
      spyOn(service, 'getNodeGroupParams').and.returnValue({
        nodes: [
          mocker.generateUuid(),
          mocker.generateUuid()
        ],
        use_complement_nodes: true
      });

      var response = service.isNodeSelectionEmpty();
      expect(response).toEqual(false);
    });
  });
});
