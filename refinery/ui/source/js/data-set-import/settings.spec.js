'use strict';

describe('refineryDataSetImport.settings: unit tests', function () {
  var settings;

  beforeEach(module('refineryApp'));
  beforeEach(module('refineryDataSetImport'));

  beforeEach(inject(function (_dataSetImportSettings_) {
    settings = _dataSetImportSettings_;
  }));

  describe('settings', function () {
    it('should be registered', function () {
      expect(settings).toBeDefined();
    });

    it('should have checkFilesUrl constant', function () {
      expect(settings.checkFilesUrl).toEqual('/data_set_manager/import/check_files/');
    });

    it('should have isaTabImportUrl constant', function () {
      expect(settings.isaTabImportUrl).toEqual('/data_set_manager/import/isa-tab-form/');
    });

    it('should have tabularFileImportUrl constant', function () {
      expect(settings.tabularFileImportUrl)
        .toEqual('/data_set_manager/import/metadata-table-form/');
    });

    it('should have uploadUrl constant', function () {
      expect(settings.uploadUrl).toEqual('/data_set_manager/import/chunked-upload/');
    });

    it('should have uploadCompleteUrl constant', function () {
      expect(settings.uploadCompleteUrl)
        .toEqual('/data_set_manager/import/chunked-upload-complete/');
    });

    it('should have chunkSize constant set to a positive integer', function () {
      expect(settings.chunkSize).toBeGreaterThan(0);
    });

    it('should have queueSize constant set to a positive integer', function () {
      expect(settings.queueSize).toBeGreaterThan(0);
    });

    it('should have ACL constant set to a string', function () {
      expect(settings.ACL).toEqual(jasmine.any(String));
    });
  });
});
