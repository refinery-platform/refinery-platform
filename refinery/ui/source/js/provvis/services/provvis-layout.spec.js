(function () {
  'use strict';

  describe('provvis Layer Service', function () {
    var service;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryProvvis'));
    beforeEach(inject(function (
      provvisLayerService
    ) {
      service = provvisLayerService;
    }));

    it('service and variables should exist', function () {
      expect(service).toBeDefined();
    });

    describe('runLayer', function () {
      it('runLayer is a method', function () {
        expect(angular.isFunction(service.runLayer)).toBe(true);
      });
    });
  });
})();

