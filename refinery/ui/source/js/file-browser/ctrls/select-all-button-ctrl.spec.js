(function () {
  'use strict';

  describe('Controller: Select All Button Ctrl', function () {
    var ctrl;
    var dataSetService;
    var fileFactory;
    var maxFileCount;
    var mockAssayService;
    var mockInputTypeUuid;
    var mockNodeCount = 5;
    var mockNodeUuid;
    var mockResetGroup;
    var scope;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryFileBrowser'));
    beforeEach(inject(function (
      $controller,
      $q,
      $rootScope,
      activeNodeService,
      assayFileService,
      dataSetPropsService,
      fileBrowserFactory,
      fileBrowserSettings,
      fileRelationshipService,
      mockParamsFactory,
      toolSelectService
    ) {
      dataSetService = dataSetPropsService;
      fileFactory = fileBrowserFactory;
      fileFactory.assayFilesTotalItems = angular.copy({ count: mockNodeCount });
      dataSetService.dataSet = angular.copy({ file_count: mockNodeCount });
      maxFileCount = fileBrowserSettings.maxFileRequest;
      mockInputTypeUuid = mockParamsFactory.generateUuid();
      mockNodeUuid = mockParamsFactory.generateUuid();
      toolSelectService.selectedTool.file_relationship = angular.copy({ input_files: [] });
      toolSelectService.selectedTool.file_relationship.input_files.push(
        { uuid: mockInputTypeUuid }
      );
      activeNodeService.selectionObj = angular.copy({ 0: { } });
      activeNodeService.selectionObj['0'][mockInputTypeUuid] = angular.copy({ });
      activeNodeService.selectionObj['0'][mockInputTypeUuid][mockNodeUuid] = true;
      mockResetGroup = spyOn(fileRelationshipService, 'resetInputGroup');
      scope = $rootScope.$new();
      ctrl = $controller('SelectAllButtonCtrl', {
        $scope: scope
      });
      mockAssayService = spyOn(assayFileService, 'query').and.callFake(function () {
        var deferred = $q.defer();
        deferred.resolve();
        return {
          $promise: deferred.promise
        };
      });
    }));

    it('Select All Button Ctrl should exist', function () {
      expect(ctrl).toBeDefined();
    });

    it('Data & UI displays variables should exist for views', function () {
      expect(ctrl.isAllSelected).toEqual(false);
      expect(ctrl.nodeSelectCount).toEqual(0);
      expect(ctrl.updatingSelectionStatus).toEqual(false);
    });

    describe('update Selection', function () {
      it('updateSelection is method', function () {
        expect(angular.isFunction(ctrl.updateSelection)).toBe(true);
      });

      it('updateSelection toggles isAllSelected flag', function () {
        ctrl.updateSelection();
        expect(ctrl.isAllSelected).toBe(true);
        ctrl.updateSelection();
        expect(ctrl.isAllSelected).toBe(false);
      });

      it('updateSelection calls on mock service when isAllSelected', function () {
        ctrl.isAllSelected = true;
        fileFactory.assayFilesTotalItems.count = maxFileCount + 1;
        dataSetService.dataSet.file_count = maxFileCount + 1;
        ctrl.updateSelection();
        expect(mockAssayService).toHaveBeenCalled();
      });

      it('updateSelection calls on mock service when !isAllSelected', function () {
        ctrl.isAllSelected = false;
        fileFactory.assayFilesTotalItems.count = maxFileCount + 1;
        dataSetService.dataSet.file_count = maxFileCount + 1;
        ctrl.updateSelection();
        expect(mockAssayService).toHaveBeenCalled();
      });

      it('updateSelection does not call on mock service when isAllSelected', function () {
        ctrl.isAllSelected = true;
        ctrl.updateSelection();
        expect(mockAssayService).not.toHaveBeenCalled();
      });

      it('updateSelection does not call on mock service when !isAllSelected', function () {
        ctrl.isAllSelected = false;
        ctrl.updateSelection();
        expect(mockAssayService).not.toHaveBeenCalled();
      });


      it('updateSelection calls on mock mockResetGroup', function () {
        ctrl.isAllSelected = true;
        ctrl.nodeSelectCount = mockNodeCount;
        ctrl.updateSelection();
        expect(mockResetGroup).toHaveBeenCalled();
      });
    });
  });
})();
