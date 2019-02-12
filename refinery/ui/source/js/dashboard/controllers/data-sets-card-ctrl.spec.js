(function () {
  'use strict';

  describe('Controller: Data Set Card Ctrl', function () {
    var ctrl;
    var mockResponseData;
    var mockService;
    var scope;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryDashboard'));
    beforeEach(inject(function (
      $controller,
      dataSetV2Service,
      $q,
      $rootScope
    ) {
      scope = $rootScope.$new();
      mockResponseData = { data: [{ name: 'Test Data Set' }], config: { params: {} } };

      mockService = spyOn(dataSetV2Service, 'query').and.callFake(function () {
        var deferred = $q.defer();
        deferred.resolve(mockResponseData);
        return { $promise: deferred.promise };
      });

      ctrl = $controller('DataSetsCardCtrl', {
        $scope: scope
      });
    }));

    it('DataSetsCardCtrl ctrl should exist', function () {
      expect(ctrl).toBeDefined();
    });

    it('Variables should be initialized', function () {
      expect(ctrl.dataSets).toEqual([]);
      expect(ctrl.groupFilter.selectedName).toEqual('All');
      expect(ctrl.params.limit).toEqual(ctrl.itemsPerPage);
      expect(ctrl.params.limit).toEqual(ctrl.itemsPerPage);
      expect(ctrl.areDataSetsTextSearched).toEqual(false);
    });

    it('Pagination variables should be initialized', function () {
      expect(ctrl.itemsPerPage).toEqual(20);
      expect(ctrl.pageStartOffset).toEqual(0);
      expect(ctrl.currentPage).toEqual(1);
      expect(ctrl.numPages).toEqual(0);
    });

    it('API related Variables should be initialized', function () {
      expect(ctrl.dataSetsError).toEqual(false);
      expect(ctrl.loadingDataSets).toEqual(true);
      expect(ctrl.searchQueryDataSets).toEqual('');
    });

    describe('filterDataSets', function () {
      it('filterDataSets is a method', function () {
        expect(angular.isFunction(ctrl.filterDataSets)).toBe(true);
      });

      it('filterDataSets sets params public field', function () {
        ctrl.groupFilter.public = true;
        ctrl.filterDataSets('public');
        expect(ctrl.params.public).toEqual('True');
      });

      it('filterDataSets remove params public field', function () {
        ctrl.groupFilter.public = false;
        ctrl.params.public = 'True';
        ctrl.filterDataSets('public');
        expect(ctrl.params.hasOwnProperty('public')).toBe(false);
      });

      it('filterDataSets sets params owned field', function () {
        ctrl.groupFilter.owned = true;
        ctrl.filterDataSets('owned');
        expect(ctrl.params.is_owner).toEqual('True');
      });

      it('filterDataSets remove params owned field', function () {
        ctrl.groupFilter.owned = false;
        ctrl.params.is_owner = 'True';
        ctrl.filterDataSets('owned');
        expect(ctrl.params.hasOwnProperty('is_owner')).toBe(false);
      });

      it('filterDataSets sets params group field', function () {
        ctrl.params.group = 5;
        var noGroupID = 0;
        ctrl.filterDataSets(noGroupID);
        expect(ctrl.params.hasOwnProperty('group')).toBe(false);
      });

      it('filterDataSets remove params group field', function () {
        var mockGroupID = 9;
        ctrl.filterDataSets(mockGroupID);
        expect(ctrl.params.group).toBe(mockGroupID);
      });
    });

    describe('refreshDataSets', function () {
      it('refreshDataSets is a method', function () {
        expect(angular.isFunction(ctrl.refreshDataSets)).toBe(true);
      });

      it('refreshDataSets calls dataSetService', function () {
        ctrl.refreshDataSets();
        scope.$apply();
        expect(mockService).toHaveBeenCalled();
      });

      it('refreshDataSets updates loadingDataSets', function () {
        expect(ctrl.loadingDataSets).toEqual(true);
        ctrl.refreshDataSets();
        scope.$apply();
        expect(ctrl.loadingDataSets).toEqual(false);
      });

      it('refreshDataSets does not update dataSetsError', function () {
        expect(ctrl.dataSetsError).toEqual(false);
        ctrl.refreshDataSets();
        scope.$apply();
        expect(ctrl.dataSetsError).toEqual(false);
      });
    });

    describe('openDataSetDeleteModal', function () {
      var mockUibModal;
      var responseFlag = false;
      beforeEach(inject(function ($uibModal) {
        mockUibModal = spyOn($uibModal, 'open').and.callFake(function () {
          return { result: { then: function () { responseFlag = true; } } };
        });
      }));

      it('openDataSetDeleteModal is method', function () {
        expect(angular.isFunction(ctrl.openDataSetDeleteModal)).toBe(true);
      });

      it('openDataSetDeleteModal opens a new modal', function () {
        ctrl.openDataSetDeleteModal();
        expect(mockUibModal).toHaveBeenCalled();
      });

      it('openDataSetDeleteModal resolves promise', function () {
        ctrl.openDataSetDeleteModal();
        expect(responseFlag).toEqual(true);
      });
    });

    describe('openPermissionEditor', function () {
      var mockUibModal;
      var responseFlag = false;
      beforeEach(inject(function ($uibModal) {
        mockUibModal = spyOn($uibModal, 'open').and.callFake(function () {
          return { result: { then: function () { responseFlag = true; } } };
        });
      }));

      it('openPermissionEditor is method', function () {
        expect(angular.isFunction(ctrl.openPermissionEditor)).toBe(true);
      });

      it('openPermissionEditor opens a new modal', function () {
        ctrl.openPermissionEditor();
        expect(mockUibModal).toHaveBeenCalled();
      });

      it('openPermissionEditor resolves promise', function () {
        ctrl.openPermissionEditor();
        expect(responseFlag).toEqual(true);
      });
    });

    describe('openDataSetTransferModal', function () {
      var mockUibModal;
      var responseFlag = false;
      beforeEach(inject(function ($uibModal) {
        mockUibModal = spyOn($uibModal, 'open').and.callFake(function () {
          return { result: { then: function () { responseFlag = true; } } };
        });
      }));

      it('openDataSetTransferModal is method', function () {
        expect(angular.isFunction(ctrl.openDataSetTransferModal)).toBe(true);
      });

      it('openDataSetTransferModal opens a new modal', function () {
        ctrl.openDataSetTransferModal();
        expect(mockUibModal).toHaveBeenCalled();
      });

      it('openDataSetTransferModal resolves promise', function () {
        ctrl.openDataSetTransferModal();
        expect(responseFlag).toEqual(true);
      });
    });

    describe('resetDataSetSearch', function () {
      it('resetDataSetSearch is a method', function () {
        expect(angular.isFunction(ctrl.resetDataSetSearch)).toBe(true);
      });

      it('resetDataSetSearch resets searchQuery', function () {
        ctrl.searchQueryDataSets = 'RNA';
        expect(ctrl.searchQueryDataSets).toEqual('RNA');
        ctrl.resetDataSetSearch();
        expect(ctrl.searchQueryDataSets).toEqual('');
      });

      it('resetDataSetSearch refreshes data', function () {
        var mockGetDataSets = spyOn(ctrl, 'refreshDataSets');
        expect(mockGetDataSets).not.toHaveBeenCalled();
        ctrl.resetDataSetSearch();
        expect(mockGetDataSets).toHaveBeenCalled();
      });
    });

    describe('pageChangedUpdate', function () {
      var mockRefresh;

      beforeEach(inject(function () {
        mockRefresh = spyOn(ctrl, 'refreshDataSets');
      }));

      it('pageChangedUpdate is a method', function () {
        expect(angular.isFunction(ctrl.pageChangedUpdate)).toBe(true);
      });

      it('calls on refresh data set', function () {
        ctrl.pageChangedUpdate();
        expect(mockRefresh).toHaveBeenCalled();
      });

      it('updates pageStartOffset', function () {
        ctrl.itemsPerPage = 20;
        ctrl.currentPage = 2;
        ctrl.pageChangedUpdate();
        expect(ctrl.pageStartOffset).toEqual(20);
      });

      it('updates params offset to equal pageStartOffset', function () {
        ctrl.itemsPerPage = 20;
        ctrl.currentPage = 2;
        ctrl.pageChangedUpdate();
        expect(ctrl.params.offset).toEqual(ctrl.pageStartOffset);
      });
    });

    describe('searchDataSets', function () {
      it('searchDataSets is a method', function () {
        expect(angular.isFunction(ctrl.searchDataSets)).toBe(true);
      });
    });
  });
})();
