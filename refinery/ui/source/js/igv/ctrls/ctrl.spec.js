'use strict';

describe('Controller: IGV Ctrl', function () {
  var ctrl;
  var scope;
  var factory;
  var $controller;
  var service;
  var $uibModalInstance = { open: function () {}, dismiss: function () {} };

  beforeEach(module('refineryApp'));
  beforeEach(module('refineryIGV'));
  beforeEach(inject(function (
    $rootScope,
    _$controller_,
    _IGVFactory_,
    _selectedNodesService_
  ) {
    scope = $rootScope.$new();
    $controller = _$controller_;
    ctrl = $controller('IGVCtrl', {
      $scope: scope,
      $uibModalInstance: $uibModalInstance
    });
    factory = _IGVFactory_;
    service = _selectedNodesService_;
  }));

  it('FileBrowserCtrl ctrl should exist', function () {
    expect(ctrl).toBeDefined();
  });

  it('Data & UI displays variables should exist for views', function () {
    expect(ctrl.igvConfig.node_selection).toEqual([]);
    expect(ctrl.speciesList).toEqual([]);
    expect(ctrl.selectedSpecies.select).toEqual();
    expect(ctrl.message).toEqual(null);
    expect(ctrl.messageType).toEqual('info');
    expect(ctrl.isLoadingSpecies).toEqual(true);
  });

  it('Helper Methods exist', function () {
    expect(angular.isFunction(ctrl.launchIgvJs)).toBe(true);
    expect(angular.isFunction(ctrl.cancel)).toBe(true);
    expect(angular.isFunction(ctrl.areSelectedNodesEmpty)).toBe(true);
  });


  describe('Test RetrieveSpecies', function () {
    it('refreshNodeGroupList is method', function () {
      expect(angular.isFunction(ctrl.retrieveSpecies)).toBe(true);
    });

    it('refreshNodeGroupList calls on correct factory method', function () {
      var mockResponse = false;
      spyOn(factory, 'getSpeciesList').and.callFake(function () {
        return {
          then: function () {
            mockResponse = true;
          }
        };
      });
      expect(mockResponse).toEqual(false);
      ctrl.retrieveSpecies();
      expect(mockResponse).toEqual(true);
    });
  });

  describe('areSelectedNodesEmpty', function () {
    it('saveNodeGroup is method', function () {
      expect(angular.isFunction(ctrl.areSelectedNodesEmpty)).toBe(true);
    });

    it('areSelectedNodesEmpty calls on service for node count', function () {
      expect(ctrl.areSelectedNodesEmpty()).toEqual(true);
      service.selectedNodesUuids = ['x508x83x-x9xx-4740-x9x7-x7x0x631280x'];
      expect(ctrl.areSelectedNodesEmpty()).toEqual(false);
    });
  });
});
