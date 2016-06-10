'use strict';

describe('Common.service.assay: unit tests', function () {
  var $httpBackend;
  var $rootScope;
  var fakeUuid = 'x508x83x-x9xx-4740-x9x7-x7x0x631280x';
  var studyFakeUuid = 'x111x11x-x1xx-1111-x1x1-x1x1x631280x';
  var service;
  var settings;
  var fakeResponse = [{
    file_name: 'a_assay.txt',
    measurement: '1969 - 1979',
    measurement_accession: '',
    measurement_source: '',
    platform: '',
    study: 10,
    technology: '',
    technology_accession: null,
    technology_source: '',
    uuid: fakeUuid
  }];

  beforeEach(function () {
    module('refineryApp');

    inject(function ($injector) {
      settings = $injector.get('settings');
      $httpBackend = $injector.get('$httpBackend');
      $rootScope = $injector.get('$rootScope');
      service = $injector.get('assayService');
    });
  });

  describe('Service', function () {
    it('should be defined', function () {
      expect(service).toBeDefined();
    });

    it('should be a method', function () {
      expect(typeof service.query).toEqual('function');
    });

    it('should return a resolving promise for fakeUuids', function () {
      $httpBackend
        .expectGET(
          settings.appRoot +
          settings.refineryApiV2 +
          '/assays/?uuid=' + fakeUuid
      ).respond(200, fakeResponse);

      var results;
      var promise = service.query({ uuid: fakeUuid })
        .$promise.then(function (response) {
          results = response[0];
        });

      expect(typeof promise.then).toEqual('function');
      $httpBackend.flush();
      $rootScope.$digest();
      var keys = Object.keys(fakeResponse[0]);

      for (var i = 0; i < keys.length; i++) {
        expect(results[keys[i]])
        .toEqual(fakeResponse[0][keys[i]]);
      }
    });

    it('should return a resolving promise for studyFakeUuids', function () {
      $httpBackend
        .expectGET(
          settings.appRoot +
          settings.refineryApiV2 +
          '/assays/?study=' + studyFakeUuid
      ).respond(200, fakeResponse);

      var results;
      var promise = service.query({ study: studyFakeUuid })
        .$promise.then(function (response) {
          results = response[0];
        });

      expect(typeof promise.then).toEqual('function');
      $httpBackend.flush();
      $rootScope.$digest();
      var keys = Object.keys(fakeResponse[0]);

      for (var i = 0; i < keys.length; i++) {
        expect(results[keys[i]])
        .toEqual(fakeResponse[0][keys[i]]);
      }
    });
  });
});
