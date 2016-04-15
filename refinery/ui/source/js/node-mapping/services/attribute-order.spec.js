'use strict';

describe('NodeMapping.factory.attributeOrder: unit tests', function () {
  var Factory;

  beforeEach(function () {
    module('refineryApp');
    module('refineryNodeMapping');

    inject(function ($injector) {
      Factory = $injector.get('AttributeOrder');
    });
  });

  describe('Factory', function () {
    it('should be available', function () {
      expect(!!Factory).toEqual(true);
    });

    it('should return a resource object', function () {
      expect(typeof Factory).toEqual('function');
      expect(typeof Factory.get).toEqual('function');
      expect(typeof Factory.save).toEqual('function');
      expect(typeof Factory.query).toEqual('function');
      expect(typeof Factory.remove).toEqual('function');
      expect(typeof Factory.delete).toEqual('function');
    });
  });
});
