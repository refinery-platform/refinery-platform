'use strict';

describe('Common.service.analysisDetail: unit tests', function () {
  var $httpBackend;
  var $rootScope;
  var params = '/';
  var fakeUuid = 'x508x83x-x9xx-4740-x9x7-x7x0x631280x';
  var service;
  var fakeResponse = {
    refineryImport: [{
      status: 'PROGRESS',
      percent_done: 30
    }],
    galaxyImport: [{
      status: '',
      percent_done: ''
    }],
    galaxyAnalysis: [{
      status: '',
      percent_done: ''
    }],
    galaxyExport: [{
      status: '',
      percent_done: ''
    }],
    overrall: 'RUNNING'
  };

  beforeEach(function () {
    module('refineryApp');

    inject(function ($injector) {
      var settings = $injector.get('settings');
      $httpBackend = $injector.get('$httpBackend');
      $rootScope = $injector.get('$rootScope');
      service = $injector.get('analysisDetailService');

      $httpBackend
        .expectGET(
          settings.appRoot +
          '/analysis_manager/' +
          fakeUuid + params
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
      expect(results.refineryImport).toEqual(fakeResponse.refineryImport);
      expect(results.galaxyImport).toEqual(fakeResponse.galaxyImport);
      expect(results.galaxyAnalysis).toEqual(fakeResponse.galaxyAnalysis);
      expect(results.galaxyExport).toEqual(fakeResponse.galaxyExport);
      expect(results.overrall).toEqual(fakeResponse.overrall);
    });
  });
});
