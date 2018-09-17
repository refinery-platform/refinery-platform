'use strict';

describe('Controller: DetailsCtrl', function () {
  var ctrl;
  var scope;
  var factory;
  var $controller;

  beforeEach(module('refineryApp'));
  beforeEach(module('refineryDataSetAbout'));
  beforeEach(inject(function (
    $rootScope, _$controller_, _dataSetAboutFactory_, $window
  ) {
    scope = $rootScope.$new();
    $controller = _$controller_;
    ctrl = $controller('AboutDetailsCtrl', {
      $scope: scope
    });
    factory = _dataSetAboutFactory_;
    $window.externalAssayUuid = 'x508x83x-x9xx-4740-x9x7-x7x0x631280x';
  }));

  it('refineryDataSetAbout ctrl should exist', function () {
    expect(ctrl).toBeDefined();
  });

  it('Data & UI displays variables should exist for views', function () {
    expect(ctrl.dataSet).toEqual({});
    expect(ctrl.studies).toEqual([]);
    expect(ctrl.assays).toEqual([]);
    expect(ctrl.fileStoreItem).toEqual({});
    expect(ctrl.isCollapsed).toEqual({
      title: true, summary: true, description: true, slug: true
    });
    expect(ctrl.editedDataSet).toEqual({});
  });

  describe('RefreshDataSetStats', function () {
    it('refreshDataSetStats is method', function () {
      expect(angular.isFunction(ctrl.refreshDataSetStats)).toBe(true);
    });

    it('RefreshDataSetStats returns calls Factory and updates mock item', function () {
      var mockDataSets = false;
      spyOn(factory, 'getDataSet').and.callFake(function () {
        return {
          then: function () {
            mockDataSets = true;
          }
        };
      });
      expect(mockDataSets).toEqual(false);
      ctrl.refreshDataSetStats();
      expect(mockDataSets).toEqual(true);
    });
  });

  describe('refreshStudies', function () {
    it('refreshStudies is method', function () {
      expect(angular.isFunction(ctrl.refreshStudies)).toBe(true);
    });

    it('RefreshStudies returns calls Factory and updates mock item', function () {
      var mockStudies = false;
      spyOn(factory, 'getStudies').and.callFake(function () {
        return {
          then: function () {
            mockStudies = true;
          }
        };
      });
      expect(mockStudies).toEqual(false);
      ctrl.refreshStudies();
      expect(mockStudies).toEqual(true);
    });
  });

  describe('refreshAssays', function () {
    it('refreshAssays is method', function () {
      expect(angular.isFunction(ctrl.refreshAssays)).toBe(true);
    });

    it('refreshAssays returns calls Factory and updates mock item', function () {
      var mockAssays = false;
      spyOn(factory, 'getStudysAssays').and.callFake(function () {
        return {
          then: function () {
            mockAssays = true;
          }
        };
      });
      expect(mockAssays).toEqual(false);
      ctrl.refreshAssays();
      expect(mockAssays).toEqual(true);
    });
  });

  describe('refreshFileStoreItem', function () {
    it('refreshFileStoreItem is method', function () {
      expect(angular.isFunction(ctrl.refreshFileStoreItem)).toBe(true);
    });

    it('refreshFileStoreItem calls Factory and updates mock item', function () {
      var mockFileStoreItem = false;
      spyOn(factory, 'getFileStoreItem').and.callFake(function () {
        return {
          then: function () {
            mockFileStoreItem = true;
          }
        };
      });
      expect(mockFileStoreItem).toEqual(false);
      ctrl.refreshFileStoreItem();
      expect(mockFileStoreItem).toEqual(true);
    });
  });

  describe('updateDataSet', function () {
    it('updateDataSet is method', function () {
      expect(angular.isFunction(ctrl.updateDataSet)).toBe(true);
    });

    it('updateDataSet returns calls Factory and updates mock item', function () {
      var mockUpdate = false;
      spyOn(factory, 'updateDataSet').and.callFake(function () {
        return {
          then: function () {
            mockUpdate = true;
          }
        };
      });
      expect(mockUpdate).toEqual(false);
      ctrl.updateDataSet('fakeFieldName', 'fakeFormInput');
      expect(mockUpdate).toEqual(true);
    });
  });
});
