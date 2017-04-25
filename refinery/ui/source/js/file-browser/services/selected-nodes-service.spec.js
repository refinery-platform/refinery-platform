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
    expect(service.selectedAllFlag).toEqual(false);
    expect(service.selectedNodeGroupUuid).toEqual('');
    expect(service.defaultCurrentSelectionUuid).toEqual('');
    expect(service.resetNodeGroup).toEqual(false);
  });

  it('all methods exist', function () {
    expect(angular.isFunction(service.setSelectedAllFlags)).toBe(true);
    expect(angular.isFunction(service.resetNodeGroupSelection)).toBe(true);
    expect(angular.isFunction(service.getNodeGroupParams)).toBe(true);
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
});
