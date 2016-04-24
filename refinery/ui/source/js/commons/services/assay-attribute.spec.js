'use strict';

describe('Common.service.assayAttribute: unit tests', function () {
  var $httpBackend;
  var $rootScope;
  var fakeUuid = 'x508x83x-x9xx-4740-x9x7-x7x0x631280x';
  var service;
  var fakeResponse = [
    {
      assay: 3,
      study: 6,
      solr_field: 'uuid',
      rank: 1,
      is_exposed: true,
      is_facet: false,
      is_active: false,
      is_internal: true,
      id: 43,
      display_name: 'uuid'
    },
    {
      assay: 3,
      study: 6,
      solr_field: 'REFINERY_ANALYSIS_UUID_6_3_s',
      rank: 2,
      is_exposed: true,
      is_facet: true,
      is_active: false,
      is_internal: false,
      id: 42,
      display_name: 'Analysis'
    },
    {
      assay: 3,
      study: 6,
      solr_field: 'REFINERY_NAME_6_3_s',
      rank: 3,
      is_exposed: false,
      is_facet: true,
      is_active: true,
      is_internal: false,
      id: 52,
      display_name: 'Name'
    }
  ];

  beforeEach(function () {
    module('refineryApp');

    inject(function ($injector) {
      var settings = $injector.get('settings');
      $httpBackend = $injector.get('$httpBackend');
      $rootScope = $injector.get('$rootScope');
      service = $injector.get('assayAttributeService');

      $httpBackend
        .expectGET(
          settings.appRoot +
          settings.refineryApiV2 +
          '/assays/' + fakeUuid + '/attributes/'
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

    it('query should return a resolving promise', function () {
      var results;
      var promise = service.query({
        uuid: fakeUuid
      }).$promise.then(function (response) {
        results = response;
      });

      expect(typeof promise.then).toEqual('function');
      $httpBackend.flush();
      $rootScope.$digest();
      expect(results.length).toEqual(fakeResponse.length);
      for (var i = 0; i < results.length; i++) {
        expect(results[i].solr_field).toEqual(fakeResponse[i].solr_field);
      }
    });
  });
});
