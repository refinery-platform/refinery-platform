describe('Common.service.authService: unit tests', function () {
  'use strict';

  var $httpBackend,
      $rootScope,
      fakeResolve = {},
      fakeResponse = {},
      params = '?format=json',
      service;

  beforeEach(function () {
    module('refineryApp');

    inject(function ($injector) {
      var settings = $injector.get('settings');

      $httpBackend = $injector.get('$httpBackend');
      $rootScope = $injector.get('$rootScope');
      service = $injector.get('authService');

      // $httpBackend
      //   .expectGET(
      //     settings.appRoot +
      //     settings.refineryApi +
      //     '/user_authentication/' +
      //     params
      //   )
      //   .respond(200, fakeResponse);
    });
  });

  describe('Service', function () {

    it('should be available', function () {
      expect(!!service).toEqual(true);
    });

    it('should have a public "isAdmin" method', function () {
      expect(typeof service.isAdmin).toEqual('function');
    });

    it('should have a public "isAuthenticated" method', function () {
      expect(typeof service.isAuthenticated).toEqual('function');
    });

  });
});
