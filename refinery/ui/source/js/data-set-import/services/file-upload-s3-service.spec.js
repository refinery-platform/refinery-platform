(function () {
  'use strict';

  describe('File upload to S3 service tests', function () {
    var service;

    beforeEach(module('refineryApp'));
    beforeEach(inject(function (
      s3UploadService
    ) {
      service = s3UploadService;
    }));

    describe('Service', function () {
      it('should be defined', function () {
        expect(service).toBeDefined();
      });
    })
  })
})();
