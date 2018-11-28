'use strict';

describe('Common.service.auth-token: unit tests', function () {
  var $httpBackend;
  var $rootScope;
  var service;
  var mocker;
  var fakeResponse;

  beforeEach(function () {
    module('refineryApp');

    inject(function ($injector) {
      var settings = $injector.get('settings');
      $httpBackend = $injector.get('$httpBackend');
      $rootScope = $injector.get('$rootScope');
      service = $injector.get('authTokenService');
      mocker = $injector.get('mockParamsFactory');
      fakeResponse = { token: mocker.generateUuid() };

      $httpBackend
        .expectGET(
          settings.appRoot +
          settings.refineryApiV2 + '/obtain-auth-token/'
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
      var result;
      var promise = service.query().$promise.then(function (response) {
        result = response;
      });

      expect(typeof promise.then).toEqual('function');
      $httpBackend.flush();
      $rootScope.$digest();
      expect(result.token).toEqual(fakeResponse.token);
    });
  });
});
