'use strict';

describe('DataSet.store: unit tests', function () {
  var Factory;
  var service;

  beforeEach(function () {
    module('refineryApp');
    module('dataSet');

    inject(function ($injector) {
      Factory = $injector.get('DataSetStore');
      service = new Factory();
    });
  });

  describe('Factory', function () {
    it('should be available', function () {
      expect(!!Factory).toEqual(true);
    });
  });

  describe('Service', function () {
    it('should be available', function () {
      expect(!!service).toEqual(true);
    });

    it('should have a public "add" method', function () {
      expect(typeof service.add).toEqual('function');
    });

    it('should have a public "get" method', function () {
      expect(typeof service.get).toEqual('function');
    });

    it('should have a public "update" method', function () {
      expect(typeof service.update).toEqual('function');
    });

    it('should have a public "remove" method', function () {
      expect(typeof service.remove).toEqual('function');
    });

    it('should set and get a value', function () {
      var key = 'test';
      var value = 'test';

      service.add(key, value);

      expect(service.get(key)).toEqual(value);
    });

    it('should be able to remove a value', function () {
      var key = 'test';
      var value = 'test';

      service.add(key, value);

      service.remove(key);

      expect(service.get(key)).toEqual(void 0);
    });
  });
});
