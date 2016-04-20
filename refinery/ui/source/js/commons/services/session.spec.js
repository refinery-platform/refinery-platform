'use strict';

describe('Common.service.sessionService: unit tests', function () {
  var service;

  beforeEach(function () {
    module('refineryApp');

    inject(function ($injector) {
      service = $injector.get('sessionService');
    });
  });

  describe('Service', function () {
    it('should be available', function () {
      expect(!!service).toEqual(true);
    });

    it('should have a public "create" method', function () {
      expect(typeof service.create).toEqual('function');
    });

    it('should have a public "get" method', function () {
      expect(typeof service.get).toEqual('function');
    });

    it('should have a public "destroy" method', function () {
      expect(typeof service.destroy).toEqual('function');
    });

    it('should create and get a value', function () {
      var fakeData = {
        isAdmin: true,
        userId: 1
      };

      service.create(fakeData);

      expect(service.get('isAdmin')).toEqual(fakeData.isAdmin);

      expect(service.get('userId')).toEqual(fakeData.userId);
    });
  });
});
