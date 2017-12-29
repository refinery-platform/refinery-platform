(function () {
  'use strict';

  describe('provvis Decl Doi Components', function () {
    var service;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryProvvis'));
    beforeEach(inject(function (
      provvisDeclDoiComponents
    ) {
      service = provvisDeclDoiComponents;
    }));

    it('service and variables should exist', function () {
      expect(service).toBeDefined();
    });

    describe('DoiComponents', function () {
      it('DoiComponents is a method', function () {
        expect(angular.isFunction(service.DoiComponents)).toBe(true);
      });
    });
  });
})();

