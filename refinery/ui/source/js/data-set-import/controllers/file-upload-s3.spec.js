(function () {
  'use strict';

  describe('RefineryFileUploadS3Ctrl', function () {
    var ctrl;
    var s3UploadService;

    beforeEach(function () {
      module('refineryApp');
      module('refineryDataSetImport');
      inject(function ($controller, $rootScope, _s3UploadService_) {
        s3UploadService = _s3UploadService_;
        ctrl = $controller('RefineryFileUploadS3Ctrl', { $scope: $rootScope.$new() });
      });
    });

    it('should exist', function () {
      expect(ctrl).toBeDefined();
    });

    describe('vm.files', function () {
      it('should be initially empty', function () {
        expect(ctrl.files).toEqual([]);
      });
    });

    describe('vm.multifileUploadInProgress', function () {
      it('should be initially false', function () {
        expect(ctrl.multifileUploadInProgress).toBe(false);
      });
    });

    describe('isUploadConfigured', function () {
      it('should be a function', function () {
        expect(ctrl.isUploadConfigured).toEqual(jasmine.any(Function));
      });
    });

    describe('addFiles', function () {
      it('should be a function', function () {
        expect(ctrl.addFiles).toEqual(jasmine.any(Function));
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
      it('should be a function', function () {
        expect(ctrl.isFileNew).toEqual(jasmine.any(Function));
      });
      it('should return true if file progress is undefined', function () {
        var file = {};
        expect(ctrl.isFileNew(file)).toBe(true);
      });
      it('should return false if file progress has been set', function () {
        var file = { progress: 0 };
        expect(ctrl.isFileNew(file)).toBe(false);
      });
    });

    describe('isUploadInProgress', function () {
      it('should be a function', function () {
        expect(ctrl.isUploadInProgress).toEqual(jasmine.any(Function));
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
      it('should be a function', function () {
        expect(ctrl.areUploadsInProgress).toEqual(jasmine.any(Function));
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
      it('should be a function', function () {
        expect(ctrl.isUploadComplete).toEqual(jasmine.any(Function));
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
      it('should be a function', function () {
        expect(ctrl.areUploadsCancellable).toEqual(jasmine.any(Function));
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
      it('should be a function', function () {
        expect(ctrl.areUploadsEnabled).toEqual(jasmine.any(Function));
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
      var file = {};
      var mockManagedUpload;
      var mockProgressHandler;
      var mockSuccessHandler;
      var mockFailureHandler;
      beforeEach(function () {
        mockManagedUpload = {
          on: function (event, callback) {
            if (event === 'httpUploadProgress') {
              mockProgressHandler = callback;
            }
          },
          promise: function () {
            return {
              then: function (success, failure) {
                mockSuccessHandler = success;
                mockFailureHandler = failure;
              }
            };
          }
        };
        spyOn(s3UploadService, 'upload').and.returnValue(mockManagedUpload);
        ctrl.uploadFile(file);
      });
      it('should be a function', function () {
        expect(ctrl.uploadFile).toEqual(jasmine.any(Function));
      });
      it('should call s3UploadService.upload()', function () {
        expect(s3UploadService.upload).toHaveBeenCalled();
      });
      it('should initialize file progress to zero', function () {
        expect(file.progress).toEqual(0);
      });
      it('should set an upload progress handler', function () {
        expect(mockProgressHandler).toEqual(jasmine.any(Function));
      });
      it('should set an upload success handler', function () {
        expect(mockSuccessHandler).toEqual(jasmine.any(Function));
      });
      it('should set an upload failure handler', function () {
        expect(mockFailureHandler).toEqual(jasmine.any(Function));
      });
    });

    describe('uploadFile error handling', function () {
      var file = {};
      beforeEach(function () {
        spyOn(s3UploadService, 'upload').and.throwError();
        ctrl.uploadFile(file);
      });
      it('should set file progress to 100 on error', function () {
        expect(file.progress).toEqual(100);
      });
      it('should set the error message', function () {
        expect(file.$error).toEqual(jasmine.any(String));
      });
    });

    describe('uploadFiles', function () {
      var newFile = {};
      var fileInProgress = { progress: 0 };
      beforeEach(function () {
        spyOn(ctrl, 'uploadFile').and.callFake(function () {});
      });
      it('should be a function', function () {
        expect(ctrl.uploadFiles).toEqual(jasmine.any(Function));
      });
      it('should upload files that have not been uploaded yet', function () {
        ctrl.files = [newFile, fileInProgress];
        ctrl.uploadFiles();
        expect(ctrl.uploadFile).toHaveBeenCalledWith(newFile);
        expect(ctrl.uploadFile.calls.count()).toEqual(1);
      });
    });

    describe('cancelUpload', function () {
      var mockManagedUpload;
      beforeEach(function () {
        mockManagedUpload = {
          abort: function () {}
        };
        spyOn(mockManagedUpload, 'abort').and.callFake(function () {});
      });
      it('should be a function', function () {
        expect(ctrl.cancelUpload).toEqual(jasmine.any(Function));
      });
      it('should remove new files from file array', function () {
        var file = {};
        ctrl.files = [file];
        ctrl.cancelUpload(file);
        expect(ctrl.files).toEqual([]);
      });
      it('should abort file uploads in progress', function () {
        var file = { progress: 0, managedUpload: mockManagedUpload };
        ctrl.files = [file];
        ctrl.cancelUpload(file);
        expect(ctrl.files).toEqual([file]);
        expect(mockManagedUpload.abort.calls.count()).toEqual(1);
      });
    });

    describe('cancelUploads', function () {
      var newFile = {};
      var fileInProgress = { progress: 0 };
      var completedFile = { success: true };
      beforeEach(function () {
        spyOn(ctrl, 'cancelUpload').and.callFake(function () {});
      });
      it('should be a function', function () {
        expect(ctrl.cancelUploads).toEqual(jasmine.any(Function));
      });
      it('should call cancelUpload() for all files', function () {
        ctrl.files = [newFile, fileInProgress, completedFile];
        ctrl.cancelUploads();
        expect(ctrl.cancelUpload.calls.count()).toEqual(3);
      });
    });
  });
})();
