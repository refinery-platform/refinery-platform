'use strict';

describe('Treemap.services.context: unit tests', function () {
  var service;

  beforeEach(function () {
    module('refineryApp');
    module('treemap');

    inject(function ($injector) {
      service = $injector.get('treemapContext');
    });
  });

  describe('Service', function () {
    it('should be available', function () {
      expect(!!service).toEqual(true);
    });

    it('should have a public "get" method', function () {
      expect(typeof service.get).toEqual('function');
    });

    it('should have a public "on" method', function () {
      expect(typeof service.on).toEqual('function');
    });

    it('should have a public "set" method', function () {
      expect(typeof service.set).toEqual('function');
    });

    it('should set and get a value', function () {
      var key = 'test';
      var value = 'test';

      service.set(key, value);

      expect(service.get(key)).toEqual(value);
    });

    it('should trigger listener when a value is set', function () {
      var key = 'test';
      var value = 'test';
      var spy = jasmine.createSpy('spy');

      service.on(key, spy);

      service.set(key, value);

      expect(spy).toHaveBeenCalled();
    });

    it('should NOT trigger listener when the same value is set', function () {
      var key = 'test';
      var value = 'test';
      var spy = jasmine.createSpy('spy');

      service.set(key, value);

      service.on(key, spy);

      service.set(key, value);

      expect(spy).not.toHaveBeenCalled();
    });

    it('should always trigger listener when `force` is `true`.', function () {
      var key = 'test';
      var value = 'test';
      var spy = jasmine.createSpy('spy');

      service.set(key, value);

      service.on(key, spy);

      service.set(key, value, true);

      expect(spy).toHaveBeenCalled();
    });
  });
});
