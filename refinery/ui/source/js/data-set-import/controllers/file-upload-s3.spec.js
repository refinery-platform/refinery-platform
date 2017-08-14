(function () {
  'use strict';

  describe('RefineryFileUploadS3Ctrl', function () {
    var $controller;
    var $rootScope;
    var ctrl;
    var scope;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryDataSetImport'));
    beforeEach(inject(function (_$controller_, _$rootScope_) {
      $controller = _$controller_;
      $rootScope = _$rootScope_;
      scope = $rootScope.$new();
      ctrl = $controller('RefineryFileUploadS3Ctrl', { $scope: scope });
    }));

    describe('multifileUploadInProgress', function () {
      it('should be false', function () {
        expect(ctrl.multifileUploadInProgress).toBe(false);
      });
    });

    describe('isFileNew', function () {
      it('should be defined', function () {
        expect(ctrl.isFileNew).toBeDefined();
      });
      it('should return true if file progress is undefined', function () {
        var file = { progress: undefined };
        expect(ctrl.isFileNew(file)).toBe(true);
      });
      it('should return false if file progress has been set', function () {
        var file = { progress: 0 };
        expect(ctrl.isFileNew(file)).toBe(false);
      });
    });

    describe('addFiles', function () {
      it('should be defined', function () {
        expect(ctrl.addFiles).toBeDefined();
      });
      it('should return no value', function () {
        expect(ctrl.addFiles([])).toBeUndefined();
      });
    });

    describe('isUploadConfigured', function () {
      it('should be defined', function () {
        expect(ctrl.isUploadConfigured).toBeDefined();
      });
    });

    describe('isUploadInProgress', function () {
      it('should be defined', function () {
        expect(ctrl.isUploadInProgress).toBeDefined();
      });
      it('should return false if file progress is undefined', function () {
        expect(ctrl.isUploadInProgress({})).toBe(false);
      });
      it('should return false if file progress is >100', function () {
        expect(ctrl.isUploadInProgress({ progress: 101 })).toBe(false);
      });
    });

    describe('areUploadsInProgress', function () {
      it('should be defined', function () {
        expect(ctrl.areUploadsInProgress).toBeDefined();
      });
      it('should return false when no files were added', function () {
        expect(ctrl.areUploadsInProgress()).toBe(false);
      });
    });

    describe('isUploadComplete', function () {
      it('should be defined', function () {
        expect(ctrl.isUploadComplete).toBeDefined();
      });
      it('should return true if upload status is error', function () {
        expect(ctrl.isUploadComplete({ $error: true })).toBe(true);
      });
      it('should return true if upload status is success', function () {
        expect(ctrl.isUploadComplete({ success: true })).toBe(true);
      });
    });

    describe('areUploadsCancellable', function () {
      it('should be defined', function () {
        expect(ctrl.areUploadsCancellable).toBeDefined();
      });
    });

    describe('areUploadsEnabled', function () {
      it('should be defined', function () {
        expect(ctrl.areUploadsEnabled).toBeDefined();
      });
    });

    describe('uploadFile', function () {
      it('should be defined', function () {
        expect(ctrl.uploadFile).toBeDefined();
      });
    });

    describe('uploadFiles', function () {
      it('should be defined', function () {
        expect(ctrl.uploadFiles).toBeDefined();
      });
    });

    describe('cancelUpload', function () {
      it('should be defined', function () {
        expect(ctrl.cancelUpload).toBeDefined();
      });
    });

    describe('cancelUploads', function () {
      it('should be defined', function () {
        expect(ctrl.cancelUploads).toBeDefined();
      });
    });
  });
})();
