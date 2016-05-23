'use strict';

describe('Common.service.authService: unit tests', function () {
  var service;

  beforeEach(function () {
    module('refineryApp');

    inject(function ($injector) {
      service = $injector.get('authService');
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
