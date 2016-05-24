'use strict';

describe('Common.dataSet.DataSetDataApi: unit tests', function () {
  var $httpBackend;
  var $rootScope;
  var Factory;
  var fakeResponse = {
    meta: {
      limit: 1,
      next: '/api/v1/data_sets/?format=json&limit=1&offset=1',
      offset: 0,
      previous: null,
      total_count: 6
    },
    objects: [
      {
        accession: '14995',
        accession_source: null,
        creation_date: '2015-07-21T18:30:26.430374',
        description: '',
        file_count: 8,
        file_size: '0',
        id: 348,
        is_owner: false,
        is_shared: null,
        modification_date: '2015-08-17T19:48:27.437821',
        name: '14995: E14.5 mouse cortical neurospheres in response to Fezf2 over-expression',
        public: true,
        resource_uri: '/api/v1/data_sets/a1417684-99e9-43ff-8ce6-676ce9cc398f/',
        share_list: null,
        slug: null,
        summary: '',
        title: 'E14.5 mouse cortical neurospheres in response to Fezf2 over-expression',
        uuid: 'a1417684-99e9-43ff-8ce6-676ce9cc398f'
      }
    ]
  };
  var params = '?format=json&limit=1&offset=0&order_by=-modification_date';
  var service;

  beforeEach(function () {
    module('refineryApp');

    inject(function ($injector) {
      var settings = $injector.get('settings');

      $httpBackend = $injector.get('$httpBackend');
      $rootScope = $injector.get('$rootScope');
      Factory = $injector.get('DataSetDataApi');
      service = new Factory();

      $httpBackend
        .expectGET(
          settings.appRoot +
          settings.refineryApi +
          '/data_sets/' +
          params
      )
        .respond(200, fakeResponse);
    });
  });

  describe('Service', function () {
    it('should be available', function () {
      expect(!!service).toEqual(true);
    });

    it('should be a method', function () {
      expect(typeof service).toEqual('function');
    });

    it('should return a resolving promise', function () {
      var promise = service(1, 0);
      var results;

      expect(typeof promise.then).toEqual('function');

      $httpBackend.flush();

      promise.then(function (data) {
        results = data;
      });

      $rootScope.$apply();

      expect(results.meta.total).toEqual(6);
      expect(results.data.length).toEqual(1);
    });
  });
});
