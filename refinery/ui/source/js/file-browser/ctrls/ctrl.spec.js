(function () {
  'use strict';

  describe('Controller: FileBrowserCtrl', function () {
    var ctrl;
    var scope;
    var factory;
    var service;
    var toolService;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryFileBrowser'));
    beforeEach(inject(function ($rootScope,
                                $controller,
                                fileBrowserFactory,
                                mockParamsFactory,
                                selectedFilterService,
                                toolSelectService,
                                $window) {
      scope = $rootScope.$new();
      ctrl = $controller('FileBrowserCtrl', {
        $scope: scope
      });
      factory = fileBrowserFactory;
      service = selectedFilterService;
      toolService = toolSelectService;
      $window.externalAssayUuid = mockParamsFactory.generateUuid();
    }));

    it('FileBrowserCtrl ctrl should exist', function () {
      expect(ctrl).toBeDefined();
    });

    it('Data & UI displays variables should exist for views', function () {
      expect(ctrl.assayAttributes).toEqual([]);
      expect(ctrl.attributeFilter).toEqual({});
      expect(ctrl.analysisFilter).toEqual({});
      expect(ctrl.collapsedToolPanel).toEqual(true);
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

    describe('Toggle Tool Panel', function () {
      it('toggleToolPanel is method', function () {
        expect(angular.isFunction(ctrl.toggleToolPanel)).toBe(true);
      });

      it('toggleToolPanel sets collapsedToolPanel to true', function () {
        toolService.isToolPanelCollapsed = false;
        ctrl.toggleToolPanel();
        expect(ctrl.collapsedToolPanel).toEqual(true);
      });

      it('toggleToolPanel sets collapsedToolPanel to false', function () {
        ctrl.toggleToolPanel();
        expect(ctrl.collapsedToolPanel).toEqual(false);
      });
    });
  });
})();
