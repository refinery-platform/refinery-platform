'use strict';

describe('Dashboard.services.dataSetPreview: unit tests', function () {
  var service;

  beforeEach(function () {
    module('refineryApp');
    module('refineryDashboard');

    inject(function ($injector) {
      service = $injector.get('dashboardDataSetPreviewService');
    });
  });

  describe('Service', function () {
    it('should be available', function () {
      expect(!!service).toEqual(true);
    });

    it('should have a public "close" method', function () {
      expect(typeof service.close).toEqual('function');
    });

    it('should have a public "preview" method', function () {
      expect(typeof service.preview).toEqual('function');
    });

    it('should have a public "dataSet" property', function () {
      expect(service.dataSet).toEqual(null);

      var propDesc = Object.getOwnPropertyDescriptor(
        Object.getPrototypeOf(service), 'dataSet'
      );

      expect(propDesc.enumerable).toEqual(true);
      expect(propDesc.writable).toEqual(true);
    });

    it('should have a public "previewing" property', function () {
      expect(service.previewing).toEqual(false);

      var propDesc = Object.getOwnPropertyDescriptor(
        Object.getPrototypeOf(service), 'previewing'
      );

      expect(propDesc.enumerable).toEqual(true);
      expect(propDesc.writable).toEqual(true);
    });

    it('should set "previewing" to true and store uuid when open', function () {
      var uuid = 'test';

      service.preview(uuid);

      expect(service.dataSetUuid).toEqual(uuid);
      expect(service.previewing).toEqual(true);
    });

    it('should set "previewing" to false after calling "close()"', function () {
      service.preview('test');
      service.close();

      expect(typeof service.dataSetUuid).toEqual('undefined');
      expect(service.previewing).toEqual(false);
    });
  });
});
