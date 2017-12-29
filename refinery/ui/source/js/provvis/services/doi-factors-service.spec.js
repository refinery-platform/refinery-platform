(function () {
  'use strict';

  describe('provvis Decl Doi Factors', function () {
    var service;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryProvvis'));
    beforeEach(inject(function (
      provvisDeclDoiFactors
    ) {
      service = provvisDeclDoiFactors;
    }));

    it('service and variables should exist', function () {
      expect(service).toBeDefined();
      expect(service.factors).toBeDefined();
    });

    describe('get', function () {
      it('get is a method', function () {
        expect(angular.isFunction(service.get)).toBe(true);
      });
    });

    describe('isMasked', function () {
      it('isMasked is a method', function () {
        expect(angular.isFunction(service.isMasked)).toBe(true);
      });
    });

    describe('set', function () {
      it('set is a method', function () {
        expect(angular.isFunction(service.set)).toBe(true);
      });
    });
  });
})();

