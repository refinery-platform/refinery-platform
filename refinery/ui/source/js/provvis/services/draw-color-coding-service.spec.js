(function () {
  'use strict';

  describe('provvis Draw Color Coding Service', function () {
    var service;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryProvvis'));
    beforeEach(inject(function (
      provvisDrawColorCodingService
    ) {
      service = provvisDrawColorCodingService;
    }));

    it('service and variables should exist', function () {
      expect(service).toBeDefined();
    });

    describe('drawColorcodingView', function () {
      it('drawColorcodingView is a method', function () {
        expect(angular.isFunction(service.drawColorcodingView)).toBe(true);
      });
    });
  });
})();

