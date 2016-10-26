'use strict';

describe('Controller: FileBrowserCtrl', function () {
  var ctrl;
  var scope;
  var factory;
  var $controller;
  var service;

  beforeEach(module('refineryApp'));
  beforeEach(module('refineryFileBrowser'));
  beforeEach(inject(function (
    $rootScope,
    _$controller_,
    _fileBrowserFactory_,
    _selectedFilterService_,
    $window
  ) {
    scope = $rootScope.$new();
    $controller = _$controller_;
    ctrl = $controller('FileBrowserCtrl', {
      $scope: scope
    });
    factory = _fileBrowserFactory_;
    service = _selectedFilterService_;
    $window.externalAssayUuid = 'x508x83x-x9xx-4740-x9x7-x7x0x631280x';
  }));

  it('FileBrowserCtrl ctrl should exist', function () {
    expect(ctrl).toBeDefined();
  });

  it('Data & UI displays variables should exist for views', function () {
    expect(ctrl.assayAttributes).toEqual([]);
    expect(ctrl.attributeFilter).toEqual({});
    expect(ctrl.analysisFilter).toEqual({});
  });

  it('Test updateFiltersFromUrlQuery', function () {
    ctrl.analysisFilter.Analysis = undefined;
    ctrl.attributeFilter = {
      Title: { facet_obj: [
        {
          count: 129,
          name: 'Device independent graphical display description'
        }, {
          count: 18,
          name: 'Graphics Facilities at Ames Research Center'
        }],
          internal_name: 'Title_Characteristics_92_46_s' } };
    service.selectedFieldList = {
      REFINERY_ANALYSIS_UUID_92_46_s: ['N/A', 'Test Workflow', '3']
    };
    spyOn(scope, '$broadcast');
    spyOn(ctrl, 'refreshSelectedFieldFromQuery');
    expect(ctrl.refreshSelectedFieldFromQuery).not.toHaveBeenCalled();
    ctrl.updateFiltersFromUrlQuery();
    expect(ctrl.refreshSelectedFieldFromQuery).toHaveBeenCalled();
  });

  it('Test RefreshSelectedFieldFromQuery', function () {
    var attributeObj = {
      facetObj: [
        {
          count: 133,
          name: 'March'
        },
        {
          count: 24,
          name: 'April'
        }
      ],
      internal_name: 'Month_Characteristics_92_46_s'
    };
    ctrl.queryKeys = ['March', 'April', 'Conner'];
    expect(service.selectedFieldList.Month_Characteristics_92_46_s)
      .not.toBeDefined();
    expect(ctrl.selectedField.March).not.toBeDefined();
    ctrl.refreshSelectedFieldFromQuery(attributeObj);
    expect(ctrl.selectedField.March).toEqual(true);
    expect(ctrl.selectedField.June).not.toBeDefined();
    expect(service.selectedFieldList.Month_Characteristics_92_46_s)
      .toEqual(['March', 'April']);
  });

  describe('Refresh AssayFiles from Factory', function () {
    it('refreshAssayFiles is method', function () {
      expect(angular.isFunction(ctrl.refreshAssayFiles)).toBe(true);
    });

    it('refreshAssayFiles returns promise', function () {
      var mockAssayFiles = false;
      spyOn(factory, 'getAssayFiles').and.callFake(function () {
        return {
          then: function () {
            mockAssayFiles = true;
          }
        };
      });

      ctrl.refreshAssayFiles();
      expect(mockAssayFiles).toEqual(true);
    });
  });
});
