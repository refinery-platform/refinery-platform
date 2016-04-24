'use strict';

describe('Common.service.node: unit tests', function () {
  var $httpBackend;
  var $rootScope;
  var fakeUuid = 'x508x83x-x9xx-4740-x9x7-x7x0x631280x';
  var service;
  var fakeResponse = {
    analysis_uuid: null,
    assay: '/api/v1/assay/5eff885e-49cb-477a-ad76-f65d74d78f8a/',
    attributes: [],
    file_import_status: 'PENDING',
    file_url: '/media/file_store/c5/d2/rfc174.txt',
    file_uuid: 'd25467be-3185-45d8-bd62-385dd54dde5a',
    name: 'http://gehlenborg.com/wp-content/uploads/rfc/rfc174.txt',
    parents: [
      '/api/v1/node/2d59008b-5abe-4f35-9199-81b75f7e9eef/'
    ],
    resource_uri: '/api/v1/node/63647300-3117-4c7b-9205-706ac4daa7fa/',
    study: '/api/v1/study/ff657398-30db-4481-bfb9-8b86f46e9000/',
    subanalysis: null,
    type: 'Raw Data File',
    uuid: '63647300-3117-4c7b-9205-706ac4daa7fa'
  };

  beforeEach(function () {
    module('refineryApp');

    inject(function ($injector) {
      var settings = $injector.get('settings');
      $httpBackend = $injector.get('$httpBackend');
      $rootScope = $injector.get('$rootScope');
      service = $injector.get('nodeService');

      $httpBackend
        .expectGET(
          settings.appRoot +
          settings.refineryApi +
          '/node/' + fakeUuid + '/?format=json'
      ).respond(200, fakeResponse);
    });
  });

  describe('Service', function () {
    it('should be defined', function () {
      expect(service).toBeDefined();
    });

    it('should be a method', function () {
      expect(typeof service).toEqual('function');
    });

    it('should return a resolving promise', function () {
      var results;
      var promise = service.query({
        uuid: fakeUuid
      }).$promise.then(function (response) {
        results = response;
      });

      expect(typeof promise.then).toEqual('function');
      $httpBackend.flush();
      $rootScope.$digest();
      expect(results.file_url)
        .toEqual(fakeResponse.file_url);
      expect(results.uuid).toEqual(fakeResponse.uuid);
      expect(results.file_uuid).toEqual(fakeResponse.file_uuid);
    });
  });
});
