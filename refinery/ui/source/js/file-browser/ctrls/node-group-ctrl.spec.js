'use strict';

describe('Controller: Node Group Ctrl', function () {
  var ctrl;
  var scope;
  var factory;
  var $controller;
  var service;
  var resetService;

  beforeEach(module('refineryApp'));
  beforeEach(module('refineryFileBrowser'));
  beforeEach(inject(function (
    $rootScope,
    _$controller_,
    _fileBrowserFactory_,
    _selectedNodesService_,
    _resetGridService_,
    $window
  ) {
    scope = $rootScope.$new();
    $controller = _$controller_;
    ctrl = $controller('NodeGroupCtrl', {
      $scope: scope
    });
    factory = _fileBrowserFactory_;
    service = _selectedNodesService_;
    resetService = _resetGridService_;
    $window.externalAssayUuid = 'x508x83x-x9xx-4740-x9x7-x7x0x631280x';
    $window.externalStudyUuid = 'x508x83x-x9xx-4740-x9x7-x7x0x631280x';
  }));

  it('FileBrowserCtrl ctrl should exist', function () {
    expect(ctrl).toBeDefined();
  });

  it('Data & UI displays variables should exist for views', function () {
    expect(ctrl.nodeGroups.groups).toEqual([]);
    expect(ctrl.nodeGroups.selected).toEqual(undefined);
  });

  it('Helper methods are method', function () {
    expect(angular.isFunction(ctrl.selectCurrentNodeGroupNodes)).toBe(true);
    expect(angular.isFunction(ctrl.clearSelectedNodes)).toBe(true);
  });

  it('selectCurrentNodeGroupNodes calls on correct service methods', function () {
    var mockServiceResponse = false;
    var mockResetResponse = false;
    ctrl.nodeGroups = {
      selected: []
    };
    spyOn(service, 'setSelectedNodeUuidsFromNodeGroup').and.callFake(function () {
      mockServiceResponse = true;
    });
    spyOn(resetService, 'setResetGridFlag').and.callFake(function () {
      mockResetResponse = true;
    });
    expect(mockServiceResponse).toEqual(false);
    expect(mockResetResponse).toEqual(false);
    ctrl.selectCurrentNodeGroupNodes();
    expect(mockServiceResponse).toEqual(true);
    expect(mockResetResponse).toEqual(true);
  });

  it('clear select nodes calls on correct service methods', function () {
    var mockServiceUuidsResponse = false;
    var mockServiceNodesResponse = false;
    var mockResetResponse = false;
    ctrl.nodeGroups = {
      groups: [{
        uuid: '7f9fdd26-187f-45d1-a87e-4d4e02d5aa1d',
        node_count: 0,
        is_implicit: false,
        study: '8486046b-22f4-447f-9c81-41dbf6173c44',
        assay: '2a3c4155-db7b-4138-afcb-67ad1cc04d51',
        is_current: false,
        nodes: [],
        name: 'Node Group 1'
      }]
    };
    spyOn(service, 'setSelectedNodeUuidsFromNodeGroup').and.callFake(function () {
      mockServiceUuidsResponse = true;
    });
    spyOn(service, 'setSelectedNodes').and.callFake(function () {
      mockServiceNodesResponse = true;
    });
    spyOn(resetService, 'setResetGridFlag').and.callFake(function () {
      mockResetResponse = true;
    });
    expect(mockServiceUuidsResponse).toEqual(false);
    expect(mockServiceNodesResponse).toEqual(false);
    expect(mockResetResponse).toEqual(false);
    expect(ctrl.nodeGroups.selected).toEqual(undefined);
    ctrl.clearSelectedNodes();
    expect(mockServiceUuidsResponse).toEqual(true);
    expect(mockServiceNodesResponse).toEqual(true);
    expect(mockResetResponse).toEqual(true);
    expect(ctrl.nodeGroups.selected).toEqual(ctrl.nodeGroups.groups[0]);
  });

  describe('Test RefreshNodeGroupList', function () {
    it('refreshNodeGroupList is method', function () {
      expect(angular.isFunction(ctrl.refreshNodeGroupList)).toBe(true);
    });

    it('refreshNodeGroupList calls on correct factory method', function () {
      var mockResponse = false;
      spyOn(factory, 'getNodeGroupList').and.callFake(function () {
        return {
          then: function () {
            mockResponse = true;
          }
        };
      });
      expect(mockResponse).toEqual(false);
      ctrl.refreshNodeGroupList();
      expect(mockResponse).toEqual(true);
    });
  });

  describe('Test saveNodeGroup', function () {
    it('saveNodeGroup is method', function () {
      expect(angular.isFunction(ctrl.saveNodeGroup)).toBe(true);
    });

    it('saveNodeGroup is method', function () {
      var mockResponse = false;
      spyOn(factory, 'createNodeGroup').and.callFake(function () {
        return {
          then: function () {
            mockResponse = true;
          }
        };
      });
      expect(mockResponse).toEqual(false);
      ctrl.saveNodeGroup('Group Name');
      expect(mockResponse).toEqual(true);
    });
  });
});
