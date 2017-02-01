'use strict';

describe('Controller: Node Group Modal Ctrl', function () {
  var ctrl;
  var scope;
  var factory;
  var $uibModalInstance = { cancel: function () {}, dismiss: function () {} };

  beforeEach(module('refineryApp'));
  beforeEach(module('refineryFileBrowser'));
  beforeEach(inject(function (
    $rootScope,
    _$controller_,
    _fileBrowserFactory_,
    _mockParamsFactory_,
    $window
  ) {
    scope = $rootScope.$new();
    var $controller = _$controller_;
    ctrl = $controller('NodeGroupModalCtrl', {
      $scope: scope,
      $uibModalInstance: $uibModalInstance
    });
    factory = _fileBrowserFactory_;
    $window.externalAssayUuid = _mockParamsFactory_.generateUuid();
  }));

  it('NodeGroupMoalCtrl should exist', function () {
    expect(ctrl).toBeDefined();
  });

  it('Data & UI displays variables should exist for views', function () {
    expect(ctrl.nodeGroupName).toEqual('');
    expect(ctrl.responseMessage).toEqual('');
    expect(ctrl.alertType).toEqual('info');
    expect(ctrl.dataLoading).toEqual(false);
  });

  it('Helper methods are method', function () {
    expect(angular.isFunction(ctrl.cancel)).toBe(true);
    expect(angular.isFunction(ctrl.close)).toBe(true);
  });

  describe('Test SaveNodeGroup', function () {
    it('saveNodeGroup is method', function () {
      expect(angular.isFunction(ctrl.saveNodeGroup)).toBe(true);
    });

    it('SaveNodeGroup does not call on factory group ', function () {
      var mockResponse = false;
      spyOn(factory, 'createNodeGroup').and.callFake(function () {
        return {
          then: function () {
            mockResponse = true;
          }
        };
      });
      expect(mockResponse).toEqual(false);
      ctrl.saveNodeGroup();
      expect(mockResponse).toEqual(false);
    });

    it('SaveNodeGroup calls on correct factory method', function () {
      var mockResponse = false;
      ctrl.nodeGroupName = 'Test Group 1';
      spyOn(factory, 'createNodeGroup').and.callFake(function () {
        return {
          then: function () {
            mockResponse = true;
          }
        };
      });
      expect(mockResponse).toEqual(false);
      ctrl.saveNodeGroup();
      expect(mockResponse).toEqual(true);
    });
  });
});
