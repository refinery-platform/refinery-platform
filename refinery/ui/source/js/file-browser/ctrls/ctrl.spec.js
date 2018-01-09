(function () {
  'use strict';

  describe('Controller: FileBrowserCtrl', function () {
    var ctrl;
    var scope;
    var toolService;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryFileBrowser'));
    beforeEach(inject(function (
      $controller,
      $rootScope,
      $window,
      fileBrowserFactory,
      mockParamsFactory,
      selectedFilterService,
      toolSelectService
    ) {
      scope = $rootScope.$new();
      ctrl = $controller('FileBrowserCtrl', {
        $scope: scope
      });
      toolService = toolSelectService;
      $window.externalAssayUuid = mockParamsFactory.generateUuid();
    }));

    it('FileBrowserCtrl ctrl should exist', function () {
      expect(ctrl).toBeDefined();
    });

    // test variable existence
    it('isOwner should exist', function () {
      expect(ctrl.isOwner).toEqual(false);
    });

    it('Data & UI displays variables should exist for views', function () {
      expect(ctrl.assayAttributes).toEqual([]);
      expect(ctrl.collapsedToolPanel).toEqual(true);
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

    describe('isFileImporting', function () {
      it('isFileImporting is method', function () {
        expect(angular.isFunction(ctrl.isFileImporting)).toBe(true);
      });

      it('returns true for N/A', function () {
        expect(ctrl.isFileImporting('N/A')).toEqual(true);
      });

      it('returns false for !N/A', function () {
        expect(ctrl.isFileImporting('www.fake.com')).toEqual(false);
      });
    });
  });
})();
