(function () {
  'use strict';

  describe('MetadataTableImportCtrl', function () {
    var ctrl;
    var importConfirmationService;
    var fileSourcesService;
    var metadataStatusService;
    var tabularFileImportApiService;

    beforeEach(function () {
      module('refineryApp');
      module('refineryDataSetImport');
      inject(function ($controller, $rootScope, _tabularFileImportApi_,
                       _fileSources_, _metadataStatusService_, _importConfirmationService_) {
        tabularFileImportApiService = _tabularFileImportApi_;
        fileSourcesService = _fileSources_;
        metadataStatusService = _metadataStatusService_;
        importConfirmationService = _importConfirmationService_;
        ctrl = $controller('MetadataTableImportCtrl', { $scope: $rootScope.$new() });
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

    describe('vm.tabularFileImportApi', function () {
      it('should be the tabularFileImportApiService', function () {
        expect(ctrl.tabularFileImportApi).toEqual(tabularFileImportApiService);
      });
    });

    describe('vm.fileSources', function () {
      it('should be the fileSourcesService', function () {
        expect(ctrl.fileSources).toEqual(fileSourcesService);
      });
    });

    describe('vm.metadataStatusService', function () {
      it('should be the metadataStatusService', function () {
        expect(ctrl.metadataStatusService).toEqual(metadataStatusService);
      });
    });

    describe('vm.importConfirmation', function () {
      it('should be the importConfirmationService', function () {
        expect(ctrl.importConfirmation).toEqual(importConfirmationService);
      });
    });

    describe('vm.whiteSpaceStripFlag', function () {
      it('should be initially false', function () {
        expect(ctrl.whiteSpaceStripFlag).toEqual(false);
      });
    });

    describe('vm.gridOptions', function () {
      it('should be a dict with a `resizeable` key that is true initially', function () {
        expect(ctrl.gridOptions.resizeable).toEqual(true);
      });
    });

    describe('vm.badFileList', function () {
      it('should be an empty array initially', function () {
        expect(ctrl.badFileList).toEqual([]);
      });
    });

    describe('vm.dataFileColumn', function () {
      it('should be null initially', function () {
        expect(ctrl.dataFileColumn).toEqual(null);
      });
    });

    describe('vm.separator', function () {
      it('should be `tab` initially', function () {
        expect(ctrl.separator).toEqual('tab');
      });
    });

    describe('vm.customSeparator', function () {
      it('should be null initially', function () {
        expect(ctrl.customSeparator).toEqual(null);
      });
    });

    describe('vm.isSeparatorOk', function () {
      it('should be true initially', function () {
        expect(ctrl.isSeparatorOk).toEqual(true);
      });
    });

    describe('vm.importErrorMessage', function () {
      it('should be null initially', function () {
        expect(ctrl.importErrorMessage).toEqual(null);
      });
    });

    describe('vm.closeError', function () {
      it('closeError is method', function () {
        expect(angular.isFunction(ctrl.closeError)).toBe(true);
      });
    });

    describe('vm.setImportOption', function () {
      it('setImportOption is method', function () {
        expect(angular.isFunction(ctrl.closeError)).toBe(true);
      });
    });

    describe('vm.clearFile', function () {
      it('clearFile is method', function () {
        expect(angular.isFunction(ctrl.clearFile)).toBe(true);
      });
    });

    describe('vm.clearTable', function () {
      it('clearTable is method', function () {
        expect(angular.isFunction(ctrl.clearTable)).toBe(true);
      });
    });

    describe('vm.setParser', function () {
      it('setParser is method', function () {
        expect(angular.isFunction(ctrl.setParser)).toBe(true);
      });
    });

    describe('vm.renderTable', function () {
      it('renderTable is method', function () {
        expect(angular.isFunction(ctrl.renderTable)).toBe(true);
      });
    });

    describe('vm.makeColumnDefs', function () {
      it('makeColumnDefs is method', function () {
        expect(angular.isFunction(ctrl.makeColumnDefs)).toBe(true);
      });
    });

    describe('vm.checkFiles', function () {
      it('checkFiles is method', function () {
        expect(angular.isFunction(ctrl.checkFiles)).toBe(true);
      });
    });

    describe('vm.confirmImport', function () {
      it('confirmImport is method', function () {
        expect(angular.isFunction(ctrl.confirmImport)).toBe(true);
      });
    });

    describe('vm.startImport', function () {
      it('confirmImport is method', function () {
        expect(angular.isFunction(ctrl.startImport)).toBe(true);
      });
    });
  });
})();
