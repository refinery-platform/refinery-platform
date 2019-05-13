(function () {
  'use strict';

  describe('Controller: FileBrowserCtrl', function () {
    var ctrl;
    var permsService;
    var resetService;
    var scope;
    var paramService;
    var toolService;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryFileBrowser'));
    beforeEach(inject(function (
      $controller,
      $rootScope,
      $window,
      dataSetGroupPermsService,
      fileBrowserFactory,
      fileParamService,
      mockParamsFactory,
      resetGridService,
      selectedFilterService,
      toolSelectService
    ) {
      scope = $rootScope.$new();
      paramService = fileParamService;
      ctrl = $controller('FileBrowserCtrl', {
        $scope: scope,
        fileParamService: paramService
      });
      permsService = dataSetGroupPermsService;
      resetService = resetGridService;
      toolService = toolSelectService;
      $window.externalAssayUuid = mockParamsFactory.generateUuid();
    }));

    it('FileBrowserCtrl ctrl should exist', function () {
      expect(ctrl).toBeDefined();
    });

    it('view models variables should should be defined', function () {
      expect(ctrl.userPerms).toEqual(permsService.userPerms);
      expect(ctrl.cachePages).toEqual(2);
      expect(ctrl.firstPage).toEqual(0);
      expect(ctrl.lastPage).toEqual(0);
      expect(ctrl.totalPages).toEqual(1);
      expect(ctrl.dataSet).toEqual({});
      expect(ctrl.editMode).toEqual(false);
      expect(ctrl.fileEditsUpdating).toEqual(false);
    });

    it('Data & UI displays variables should exist for views', function () {
      expect(ctrl.assayAttributes).toEqual([]);
      expect(ctrl.collapsedToolPanel).toEqual(true);
    });

    describe('Toggle Edit Mode', function () {
      it('toggleEditMode is method', function () {
        expect(angular.isFunction(ctrl.toggleEditMode)).toBe(true);
      });
      it('toggleEditMode toggles editMode flag', function () {
        ctrl.toggleEditMode();
        expect(ctrl.editMode).toBe(true);
        ctrl.toggleEditMode();
        expect(ctrl.editMode).toBe(false);
      });
      it('toggleEditMode updates gridOptions to equal editMode', function () {
        ctrl.toggleEditMode();
        expect(ctrl.gridOptions.enableCellEdit).toBe(ctrl.editMode);
      });
      it('toggleEditMode calls on service', function () {
        var mockRefresh = spyOn(resetService, 'setRefreshGridFlag');
        ctrl.toggleEditMode();
        expect(mockRefresh).toHaveBeenCalled();
      });
    });

    describe('Toggle Tool Panel', function () {
      beforeEach(inject(function () {
        var mockGridApi = {
          handleWindowResize: function () { return; }
        };
        ctrl.gridApi = angular.copy({
          core: {}
        });
        angular.copy(mockGridApi, ctrl.gridApi.core);
      }));
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

    describe('openPermissionEditor', function () {
      var mockUibModal;
      beforeEach(inject(function ($uibModal) {
        mockUibModal = spyOn($uibModal, 'open');
      }));
      it('openPermissionEditor is method', function () {
        expect(angular.isFunction(ctrl.openPermissionEditor)).toBe(true);
      });
      it('openPermissionEditor opens a new modal', function () {
        ctrl.openPermissionEditor();
        expect(mockUibModal).toHaveBeenCalled();
      });
    });

    describe('uiGrid csv export', function () {
      var assayFiles = {
        nodes: [],
        attributes: [],
        facet_field_counts: {}
      };
      var gridExporterService;
      var externalAssayUuid;

      beforeEach(inject(function ($q, $window, fileBrowserFactory, uiGridExporterService) {
        gridExporterService = uiGridExporterService;
        externalAssayUuid = $window.externalAssayUuid;
        spyOn(fileBrowserFactory, 'getAssayFiles').and.returnValue(assayFiles);
      }));

      describe('gridOptions.exporterAllDataFn tests', function () {
        it('is defined', function () {
          expect(angular.isFunction(ctrl.gridOptions.exporterAllDataFn)).toBe(true);
        });

        it('returns assayFiles response', function () {
          expect(ctrl.gridOptions.exporterAllDataFn()).toEqual(assayFiles);
        });

        it('gridOptions.exporterSuppressColumns excludes Input Groups', function () {
          expect(ctrl.gridOptions.exporterSuppressColumns).toEqual(['Input Groups']);
        });
      });

      describe('downloadCsv tests', function () {
        it('is defined', function () {
          expect(angular.isFunction(ctrl.downloadCsv)).toBe(true);
        });

        it('downloadCsv calls csvExport with proper visibility when filtered', function () {
          var mockFilterAttribute = { REFINERY_TYPE_48_24_s: ['Raw Data File'] };
          paramService.setParamFilterAttribute(mockFilterAttribute);
          spyOn(gridExporterService, 'csvExport');
          ctrl.gridApi = { grid: { fake_grid: {} } };
          ctrl.downloadCsv();
          expect(gridExporterService.csvExport).toHaveBeenCalledWith(
            { fake_grid: {} }, 'visible', 'visible'
          );
        });

        it('calls csvExport with proper visibility when not filtered', function () {
          spyOn(gridExporterService, 'csvExport');
          ctrl.gridApi = { grid: { fake_grid: {} } };
          ctrl.downloadCsv();
          expect(gridExporterService.csvExport).toHaveBeenCalledWith(
            { fake_grid: {} }, 'all', 'all'
          );
        });
      });

      describe('isFiltered tests', function () {
        it('is defined', function () {
          expect(angular.isFunction(ctrl.isFiltered)).toBe(true);
        });

        it('is false when filter_attribute is undefined', function () {
          expect(ctrl.isFiltered()).toBe(false);
        });

        it('is false when filter_attribute is empty object', function () {
          paramService.setParamFilterAttribute({});
          expect(ctrl.isFiltered()).toBe(false);
        });

        it('is true when filter_attribute is populated', function () {
          var mockFilterAttribute = { REFINERY_TYPE_48_24_s: ['Raw Data File'] };
          paramService.setParamFilterAttribute(mockFilterAttribute);
          expect(ctrl.isFiltered()).toBe(true);
        });
      });

      describe('downloadCsvQuery tests', function () {
        it('is defined', function () {
          expect(angular.isFunction(ctrl.downloadCsvQuery)).toBe(true);
        });
        it('returns appropriate value', function () {
          expect(ctrl.downloadCsvQuery()).toEqual(
            'assay_uuid=' + externalAssayUuid + '&filter_attribute=%7B%7D&limit=100000000'
          );
        });
      });

      describe('setCsvFileName tests', function () {
        it('is defined', function () {
          expect(angular.isFunction(ctrl.setCsvFileName)).toBe(true);
        });

        it('sets grid options appropriately', function () {
          ctrl.setCsvFileName('Test DataSet Name');
          expect(ctrl.gridOptions.exporterCsvFilename).toEqual('Test DataSet Name.csv');
        });
      });
    });
  });
})();
