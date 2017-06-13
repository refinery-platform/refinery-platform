(function () {
  'use strict';

  describe('Controller: AssayFiltersCtrl', function () {
    var ctrl;
    var scope;
    var service;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryFileBrowser'));
    beforeEach(inject(function (
      $controller,
      $rootScope,
      $window,
      mockParamsFactory,
      selectedFilterService
    ) {
      scope = $rootScope.$new();
      ctrl = $controller('AssayFiltersCtrl', {
        $scope: scope
      });
      service = selectedFilterService;
      $window.externalAssayUuid = mockParamsFactory.generateUuid();
    }));

    it('AssayFiltersCtrl ctrl should exist', function () {
      expect(ctrl).toBeDefined();
    });

    it('Data & UI displays variables should exist for views', function () {
      expect(ctrl.attributeFilter).toEqual({});
      expect(ctrl.analysisFilter).toEqual({});
      expect(ctrl.updateFilterDOM).toEqual(false);
      expect(ctrl.uiSelectedFields).toEqual({});
    });

    it('QueryKeys to be set should exist for views', function () {
      expect(ctrl.queryKeys).toEqual([]);
    });

    it('Test updateFiltersFromUrlQuery', function () {
      ctrl.analysisFilter.Analysis = undefined;
      ctrl.attributeFilter = {
        Title: {
          facet_obj: [
            {
              count: 129,
              name: 'Device independent graphical display description'
            }, {
              count: 18,
              name: 'Graphics Facilities at Ames Research Center'
            }],
          internal_name: 'Title_Characteristics_92_46_s'
        }
      };
      service.attributeSelectedFields = {
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
      ctrl.queryKeys = ['{"Month_Characteristics_92_46_s":"March"}',
        '{"Month_Characteristics_92_46_s":"April"}', +
          '{"Author_Characteristics_82_36_s":"Conner"}'];

      expect(service.attributeSelectedFields.Month_Characteristics_92_46_s)
        .not.toBeDefined();
      expect(ctrl.uiSelectedFields.Month_Characteristics_92_46_s).not.toBeDefined();
      ctrl.refreshSelectedFieldFromQuery(attributeObj);
      expect(ctrl.uiSelectedFields.Month_Characteristics_92_46_s.March).toEqual(true);
      expect(ctrl.uiSelectedFields.Month_Characteristics_92_46_s.June).not.toBeDefined();
      expect(service.attributeSelectedFields.Month_Characteristics_92_46_s)
        .toEqual(['March', 'April']);
    });
  });
})();
