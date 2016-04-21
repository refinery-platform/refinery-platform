'use strict';

describe('Common.service.analysis: unit tests', function () {
  var $httpBackend;
  var $rootScope;
  var fakeUuid = 'x508x83x-x9xx-4740-x9x7-x7x0x631280x';
  var params = '/?format=json&' +
    'limit=0&' +
    'order_by=-time_start&' +
    'uuid=' + fakeUuid;
  var service;
  var fakeResponse = {
    meta: {
      limit: 1000,
      next: null,
      offset: 0,
      previous: null,
      total_count: 0
    },
    objects: [{
      test1: 1
    }, {
      test2: 2
    }, {
      test3: 3
    }, {
      test4: 4
    }]
  };

  beforeEach(function () {
    module('refineryApp');

    inject(function ($injector) {
      var settings = $injector.get('settings');
      $httpBackend = $injector.get('$httpBackend');
      $rootScope = $injector.get('$rootScope');
      service = $injector.get('analysisService');

      $httpBackend
        .expectGET(
          settings.appRoot +
          settings.refineryApi +
          '/analysis' + params
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
      var promise = service.get({
        uuid: fakeUuid
      }).$promise.then(function (response) {
        results = response;
      });

      expect(typeof promise.then).toEqual('function');
      $httpBackend.flush();
      $rootScope.$digest();
      expect(results.objects).toEqual(fakeResponse.objects);
    });
  });
});
