(function () {
  'use strict';

  describe('provvis Init Service', function () {
    var service;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryProvvis'));
    beforeEach(inject(function (
      provvisInitService
    ) {
      service = provvisInitService;
    }));

    it('service and variables should exist', function () {
      expect(service).toBeDefined();
    });

    describe('initGraph', function () {
      it('initGraph is a method', function () {
        expect(angular.isFunction(service.initGraph)).toBe(true);
      });
    });

    describe('reset', function () {
      it('reset is a method', function () {
        expect(angular.isFunction(service.reset)).toBe(true);
      });
    });
  });
})();

