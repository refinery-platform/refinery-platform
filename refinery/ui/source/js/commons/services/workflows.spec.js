'use strict';

describe('Common.service.workflows: unit tests', function () {
  var $httpBackend;
  var $rootScope;
  var fakeUuid = 'x508x83x-x9xx-4740-x9x7-x7x0x631280x';
  var service;
  var settings;

  var fakeResponse = {
    status: '201',
    workflow: {
      name: 'foo'
    }
  };

  beforeEach(function () {
    module('refineryApp');

    inject(function ($injector) {
      settings = $injector.get('settings');
      $httpBackend = $injector.get('$httpBackend');
      $rootScope = $injector.get('$rootScope');
      service = $injector.get('dataSetV2Service');
    });
  });

  describe('Service', function () {
    it('should be defined', function () {
      expect(service).toBeDefined();
    });

    it('should be a method', function () {
      expect(typeof service).toEqual('function');
    });

    it('query for workflow should return a resolving promise', function () {
      $httpBackend
        .expectGET(
          settings.appRoot +
          settings.refineryApiV2 +
          '/workflows/' + fakeUuid + '/'
      ).respond(200, fakeResponse);

      var results;
      var promise = service.query({ uuid: fakeUuid }).$promise
        .then(function (response) {
          results = response;
        });
      expect(typeof promise.then).toEqual('function');
      $httpBackend.flush();
      $rootScope.$digest();
      expect(results.data.workflow.name).toEqual(fakeResponse.workflow.name);
    });
  });
});
