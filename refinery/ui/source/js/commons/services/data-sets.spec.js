'use strict';

describe('Common.service.dataSets: unit tests', function () {
  var $httpBackend;
  var $rootScope;
  var fakeUuid = 'x508x83x-x9xx-4740-x9x7-x7x0x631280x';
  var service;
  var settings;
  var fakeResponse = {
    accession: 'Test 1',
    accession_source: null,
    creation_date: '2016-05-12T08:43:30.362877',
    description: '',
    file_count: 62,
    file_size: 75234,
    id: 5,
    is_owner: true,
    is_shared: false,
    isa_archive: '89774554-c1c4-459f-af3a-059de6eaffdf',
    modification_date: '2016-05-27T09:33:18.696246',
    name: 'Test 1: Request for Comments (RFC) Test',
    owner: '5377caec-0e4f-4de5-9db5-3214b6ef0857',
    public: false,
    resource_uri: '/api/v1/data_sets/db03efb7-cf01-4840-bcb2-7b023efc290c/',
    share_list: null,
    slug: null,
    summary: '',
    title: 'Request for Comments (RFC) Test',
    uuid: 'db03efb7-cf01-4840-bcb2-7b023efc290c'
  };

  beforeEach(function () {
    module('refineryApp');

    inject(function ($injector) {
      settings = $injector.get('settings');
      $httpBackend = $injector.get('$httpBackend');
      $rootScope = $injector.get('$rootScope');
      service = $injector.get('dataSetService');
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
          settings.refineryApi +
          '/data_sets/?format=json&order_by=-modification_date&uuid=' + fakeUuid
      ).respond(200, fakeResponse);

      var results;
      var promise = service.query({ uuid: fakeUuid })
        .$promise.then(function (response) {
          results = response;
        });

      expect(typeof promise.then).toEqual('function');
      $httpBackend.flush();
      $rootScope.$digest();
      var keys = Object.keys(fakeResponse);

      for (var i = 0; i < keys.length; i++) {
        expect(results[keys[i]])
        .toEqual(fakeResponse[keys[i]]);
      }
    });
  });
});
