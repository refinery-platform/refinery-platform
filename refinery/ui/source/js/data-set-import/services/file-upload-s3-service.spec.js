(function () {
  'use strict';

  describe('s3UploadService', function () {
    var service;

    beforeEach(module('refineryApp'));
    beforeEach(inject(function (_s3UploadService_) {
      service = _s3UploadService_;
    }));

    it('should exist', function () {
      expect(service).toBeDefined();
    });

    it('should have property named progress with default value of zero', function () {
      expect(service.progress).toEqual(0);
    });
  });
})();
