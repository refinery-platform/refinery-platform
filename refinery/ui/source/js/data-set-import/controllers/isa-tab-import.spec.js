(function () {
  'use strict';

  describe('IsaTabImportCtrl', function () {
    var ctrl;
    var isaTabImportApiService;

    beforeEach(function () {
      module('refineryApp');
      module('refineryDataSetImport');
      inject(function ($controller, $rootScope, isaTabImportApi) {
        isaTabImportApiService = isaTabImportApi;
        ctrl = $controller('IsaTabImportCtrl', { $scope: $rootScope.$new() });
      });
    });

    it('should exist', function () {
      expect(ctrl).toBeDefined();
    });

    describe('vm.showFileUpload', function () {
      it('should be initially false', function () {
        expect(ctrl.showFileUpload).toEqual(false);
      });
    });

    describe('vm.dataSetUUID', function () {
      it('should be initially undefined', function () {
        expect(ctrl.dataSetUUID).toEqual(undefined);
      });
    });

    describe('vm.isMetaDataRevision', function () {
      it('should be initially false', function () {
        expect(ctrl.isMetaDataRevision).toEqual(false);
      });
    });

    describe('vm.isaTabImportApi', function () {
      it('should be the isaTabImportApiService', function () {
        expect(ctrl.isaTabImportApi).toEqual(isaTabImportApiService);
      });
    });

    describe('vm.closeError', function () {
      it('closeError is method', function () {
        expect(angular.isFunction(ctrl.closeError)).toBe(true);
      });
    });

    describe('vm.setImportOption', function () {
      it('setImportOption is method', function () {
        expect(angular.isFunction(ctrl.setImportOption)).toBe(true);
      });
    });

    describe('vm.checkImportOption', function () {
      it('checkImportOption is method', function () {
        expect(angular.isFunction(ctrl.checkImportOption)).toBe(true);
      });
    });

    describe('vm.clearFile', function () {
      it('clearFile is method', function () {
        expect(angular.isFunction(ctrl.clearFile)).toBe(true);
      });
    });

    describe('vm.confirmImport', function () {
      it('confirmImport is method', function () {
        expect(angular.isFunction(ctrl.confirmImport)).toBe(true);
      });
    });

    describe('vm.startImport', function () {
      it('startImport is method', function () {
        expect(angular.isFunction(ctrl.startImport)).toBe(true);
      });
    });
  });
})();
