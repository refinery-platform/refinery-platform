(function () {
  'use strict';

  describe('provvis Dagre Layout Service', function () {
    var service;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryProvvis'));
    beforeEach(inject(function (
      provvisDagreLayoutService
    ) {
      service = provvisDagreLayoutService;
    }));

    it('service and variables should exist', function () {
      expect(service).toBeDefined();
    });

    describe('dagreDynamicLayerLayout', function () {
      it('dagreDynamicLayerLayout is a method', function () {
        expect(angular.isFunction(service.dagreDynamicLayerLayout)).toBe(true);
      });
    });

    describe('dagreLayerLayout', function () {
      it('dagreLayerLayout is a method', function () {
        expect(angular.isFunction(service.dagreLayerLayout)).toBe(true);
      });
    });
  });
})();

