'use strict';

describe('Common.service.deletionService: unit tests', function () {
  var fakeUuid = 'x508x83x-x9xx-4740-x9x7-x7x0x631280x';
  var $httpBackend;
  var service;
  var settings;

  beforeEach(function () {
    module('refineryApp');

    inject(function ($injector) {
      settings = $injector.get('settings');
      $httpBackend = $injector.get('$httpBackend');
      service = $injector.get('deletionService');
    });
  });

  describe('Service', function () {
    it('should be defined', function () {
      expect(service).toBeDefined();
    });

    it('should be a method', function () {
      expect(typeof service.delete).toEqual('function');
    });

    it('should return a 404 when trying to delete something that doesnt' +
      ' exist', function () {
      $httpBackend
        .expectDELETE(
          settings.appRoot +
          settings.refineryApiV2 +
          '/data_sets/' + fakeUuid
      ).respond(404);
    });

    it('should return a 404 when trying to delete something that doesnt' +
      ' exist', function () {
      $httpBackend
        .expectDELETE(
          settings.appRoot +
          settings.refineryApiV2 +
          '/analyses/' + fakeUuid
      ).respond(404);
    });
  });
});
