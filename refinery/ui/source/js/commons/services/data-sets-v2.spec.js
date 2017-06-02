'use strict';

describe('Common.service.dataSetsV2: unit tests', function () {
  var $httpBackend;
  var $rootScope;
  var fakeUuid = 'x508x83x-x9xx-4740-x9x7-x7x0x631280x';
  var service;
  var settings;
  var param = {
    name: 'Bam Test File V2'
  };

  var fakeResponse = {
    status: '201',
    data: {
      name: param.name
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

    it('patch should return a resolving promise', function () {
      $httpBackend
        .expectPATCH(
          settings.appRoot +
          settings.refineryApiV2 +
          '/data_sets/' + fakeUuid +
          '/?format=json',
          param
      ).respond(200, fakeResponse);

      var results;
      param.uuid = fakeUuid;
      var promise = service.partial_update(param).$promise
        .then(function (response) {
          results = response;
        });

      expect(typeof promise.then).toEqual('function');
      $httpBackend.flush();
      $rootScope.$digest();
      expect(results.status).toEqual(fakeResponse.status);
      expect(results.data.name).toEqual(fakeResponse.data.name);
    });
  });
});
