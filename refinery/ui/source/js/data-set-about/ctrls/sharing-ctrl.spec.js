'use strict';

describe('Controller: AboutSharingCtrl', function () {
  var ctrl;
  var scope;
  var factory;
  var $controller;

  beforeEach(module('refineryApp'));
  beforeEach(module('refineryDataSetAbout'));
  beforeEach(inject(function (
    $rootScope, _$controller_, _dataSetAboutFactory_
  ) {
    scope = $rootScope.$new();
    $controller = _$controller_;
    ctrl = $controller('AboutSharingCtrl', {
      $scope: scope
    });
    factory = _dataSetAboutFactory_;
  }));

  it('AboutSharingCtrl ctrl should exist', function () {
    expect(ctrl).toBeDefined();
  });

  it('Data & UI displays variables should exist for views', function () {
    expect(ctrl.dataSetSharing).toEqual({});
    expect(ctrl.ownerName).toEqual('');
    expect(ctrl.groupList).toEqual([]);
  });

  describe('RefreshDataSetSharing', function () {
    it('refreshDataSetStats is method', function () {
      expect(angular.isFunction(ctrl.refreshDataSetSharing)).toBe(true);
    });

    it('RefreshDataSetSharing returns calls Factory and updates mock item', function () {
      var mockDataSets = false;
      spyOn(factory, 'getDataSetSharing').and.callFake(function () {
        return {
          then: function () {
            mockDataSets = true;
          }
        };
      });
      expect(mockDataSets).toEqual(false);
      ctrl.refreshDataSetSharing();
      expect(mockDataSets).toEqual(true);
    });
  });

  describe('refreshGroup', function () {
    it('refreshGroup is method', function () {
      expect(angular.isFunction(ctrl.refreshGroup)).toBe(true);
    });

    it('RefreshGroup returns calls Factory and updates mock item', function () {
      var mockGroup = false;
      spyOn(factory, 'getGroup').and.callFake(function () {
        return {
          then: function () {
            mockGroup = true;
          }
        };
      });
      expect(mockGroup).toEqual(false);
      ctrl.refreshGroup();
      expect(mockGroup).toEqual(true);
    });
  });

  describe('refreshOwnerName', function () {
    it('refreshOwnerName is method', function () {
      expect(angular.isFunction(ctrl.refreshOwnerName)).toBe(true);
    });

    it('refreshOwnerName returns calls Factory and updates mock item', function () {
      var mockOwnerName = '';
      spyOn(factory, 'getOwnerName').and.callFake(function () {
        return {
          then: function () {
            mockOwnerName = 'Paul Stevens';
          }
        };
      });
      expect(mockOwnerName).toEqual('');
      ctrl.refreshOwnerName();
      expect(mockOwnerName).toEqual('Paul Stevens');
    });
  });
});
