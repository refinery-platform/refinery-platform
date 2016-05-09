'use strict';

describe('Controller: FileBrowserCtrl', function () {
  var ctrl;
  var scope;
  var factory;
  var $controller;

  beforeEach(module('refineryApp'));
  beforeEach(module('refineryFileBrowser'));
  beforeEach(inject(function (
    $rootScope, _$controller_, _fileBrowserFactory_, $window
  ) {
    scope = $rootScope.$new();
    $controller = _$controller_;
    ctrl = $controller('FileBrowserCtrl', {
      $scope: scope
    });
    factory = _fileBrowserFactory_;
    $window.externalAssayUuid = 'x508x83x-x9xx-4740-x9x7-x7x0x631280x';
  }));

  it('FileBrowserCtrl ctrl should exist', function () {
    expect(ctrl).toBeDefined();
  });

  it('Data & UI displays variables should exist for views', function () {
    expect(ctrl.assayFiles).toEqual([]);
    expect(ctrl.assayAttributes).toEqual([]);
    expect(ctrl.attributeFilter).toEqual([]);
    expect(ctrl.analysisFilter).toEqual([]);
    expect(ctrl.filesParam).toBeDefined();
  });

  it('Test checkUrlQueryFilters', function () {
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
    ctrl.selectedFieldList = {
      REFINERY_ANALYSIS_UUID_92_46_s: ['N/A', 'Test Workflow', '3']
    };
    spyOn(scope, '$broadcast');
    spyOn(ctrl, 'refreshSelectedFieldFromQuery');
    spyOn(ctrl, 'reset');
    expect(ctrl.refreshSelectedFieldFromQuery).not.toHaveBeenCalled();
    expect(scope.$broadcast).not.toHaveBeenCalled();
    expect(ctrl.reset).not.toHaveBeenCalled();
    ctrl.checkUrlQueryFilters();
    expect(ctrl.selectedFieldList).toEqual(ctrl.filesParam.filter_attribute);
    expect(ctrl.refreshSelectedFieldFromQuery).toHaveBeenCalled();
    expect(scope.$broadcast).toHaveBeenCalled();
    expect(ctrl.reset).toHaveBeenCalled();
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
    expect(ctrl.selectedFieldList.Month_Characteristics_92_46_s)
      .not.toBeDefined();
    expect(ctrl.selectedField.March).not.toBeDefined();
    ctrl.refreshSelectedFieldFromQuery(attributeObj);
    expect(ctrl.selectedField.March).toEqual(true);
    expect(ctrl.selectedField.June).not.toBeDefined();
    expect(ctrl.selectedFieldList.Month_Characteristics_92_46_s)
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
