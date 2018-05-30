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
      mockResponseData = [{ name: 'Test Data Set' }];

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
    });

    it('API related Variables should be initialized', function () {
      expect(ctrl.dataSetsError).toEqual(false);
      expect(ctrl.loadingDataSets).toEqual(true);
      expect(ctrl.params).toEqual({ });
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

    describe('getDataSets', function () {
      it('getDataSets is a method', function () {
        expect(angular.isFunction(ctrl.getDataSets)).toBe(true);
      });

      it('getDataSets calls dataSetService', function () {
        ctrl.getDataSets();
        scope.$apply();
        expect(mockService).toHaveBeenCalled();
      });

      it('getDataSets updates loadingDataSets', function () {
        expect(ctrl.loadingDataSets).toEqual(true);
        ctrl.getDataSets();
        scope.$apply();
        expect(ctrl.loadingDataSets).toEqual(false);
      });

      it('getDataSets does not update dataSetsError', function () {
        expect(ctrl.dataSetsError).toEqual(false);
        ctrl.getDataSets();
        scope.$apply();
        expect(ctrl.dataSetsError).toEqual(false);
      });

      it('getDataSets updates dataSets variable', function () {
        ctrl.getDataSets();
        scope.$apply();
        expect(ctrl.dataSets[0].name).toEqual(mockResponseData[0].name);
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
        var mockGetDataSets = spyOn(ctrl, 'getDataSets');
        expect(mockGetDataSets).not.toHaveBeenCalled();
        ctrl.resetDataSetSearch();
        expect(mockGetDataSets).toHaveBeenCalled();
      });
    });

    describe('searchDataSets', function () {
      it('searchDataSets is a method', function () {
        expect(angular.isFunction(ctrl.searchDataSets)).toBe(true);
      });
    });
  });
})();
