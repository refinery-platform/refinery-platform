(function () {
  'use strict';

  describe('Controller: FileBrowserCtrl', function () {
    var ctrl;
    var permsService;
    var resetService;
    var scope;
    var toolService;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryFileBrowser'));
    beforeEach(inject(function (
      $controller,
      $rootScope,
      $window,
      dataSetPermsService,
      fileBrowserFactory,
      mockParamsFactory,
      resetGridService,
      selectedFilterService,
      toolSelectService
    ) {
      scope = $rootScope.$new();
      ctrl = $controller('FileBrowserCtrl', {
        $scope: scope
      });
      permsService = dataSetPermsService;
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
  });
})();
