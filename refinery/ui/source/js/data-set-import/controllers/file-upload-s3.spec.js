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

    it('RefineryFileUploadS3Ctrl should exist', function () {
      expect(ctrl).toBeDefined();
    });

    describe('vm.files', function () {
      it('should be undefined', function () {
        expect(ctrl.files).toBeUndefined();
      });
    });

    describe('vm.multifileUploadInProgress', function () {
      it('should be false', function () {
        expect(ctrl.multifileUploadInProgress).toBe(false);
      });
    });

    describe('isUploadConfigured', function () {
      it('should be defined', function () {
        expect(ctrl.isUploadConfigured).toBeDefined();
      });
    });

    describe('addFiles', function () {
      it('should be defined', function () {
        expect(ctrl.addFiles).toBeDefined();
      });
      it('should return no value', function () {
        expect(ctrl.addFiles([])).toBeUndefined();
      });
      it('should add files', function () {
        ctrl.addFiles([]);
        expect(ctrl.files).toEqual([]);
      });
      it('should concatenate files if files exist', function () {
        ctrl.files = [{}];
        ctrl.addFiles([{}]);
        expect(ctrl.files).toEqual([{}, {}]);
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

    describe('isUploadInProgress', function () {
      it('should be defined', function () {
        expect(ctrl.isUploadInProgress).toBeDefined();
      });
      it('should return false if file is new', function () {
        spyOn(ctrl, 'isFileNew').and.returnValue(true);
        expect(ctrl.isUploadInProgress({})).toBe(false);
        expect(ctrl.isFileNew).toHaveBeenCalled();
      });
      it('should return false if file progress is >100', function () {
        expect(ctrl.isUploadInProgress({ progress: 101 })).toBe(false);
      });
      it('should return false if file progress is <=100', function () {
        expect(ctrl.isUploadInProgress({ progress: 0 })).toBe(true);
      });
    });

    describe('areUploadsInProgress', function () {
      it('should be defined', function () {
        expect(ctrl.areUploadsInProgress).toBeDefined();
      });
      it('should return false when no files were added', function () {
        expect(ctrl.areUploadsInProgress()).toBe(false);
      });
      it('should return true when at least one upload is in progress', function () {
        ctrl.files = [{ progress: 0 }];
        expect(ctrl.areUploadsInProgress()).toBe(true);
      });
    });

    describe('isUploadComplete', function () {
      it('should be defined', function () {
        expect(ctrl.isUploadComplete).toBeDefined();
      });
      it('should return true if upload status is error', function () {
        expect(ctrl.isUploadComplete({ $error: 'error message' })).toBe(true);
      });
      it('should return true if upload status is success', function () {
        expect(ctrl.isUploadComplete({ success: true })).toBe(true);
      });
      it('should return false if upload status is undefined', function () {
        expect(ctrl.isUploadComplete({})).toBe(false);
      });
    });

    describe('areUploadsCancellable', function () {
      it('should be defined', function () {
        expect(ctrl.areUploadsCancellable).toBeDefined();
      });
      it('should return false when no files were added', function () {
        expect(ctrl.areUploadsCancellable()).toBe(false);
      });
      it('should return true when at least one file has not been uploaded', function () {
        ctrl.files = [{}];
        expect(ctrl.areUploadsCancellable()).toBe(true);
      });
    });

    describe('areUploadsEnabled', function () {
      it('should be defined', function () {
        expect(ctrl.areUploadsEnabled).toBeDefined();
      });
      it('should return false when no files were added', function () {
        expect(ctrl.areUploadsEnabled()).toBe(false);
      });
      it('should return false when any uploads are in progress', function () {
        ctrl.files = [{ progress: 0 }];
        expect(ctrl.areUploadsEnabled()).toBe(false);
      });
      it('should return true when any files were added', function () {
        ctrl.files = [{}];
        expect(ctrl.areUploadsEnabled()).toBe(true);
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
