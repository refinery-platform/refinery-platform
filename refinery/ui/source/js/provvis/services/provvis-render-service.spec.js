(function () {
  'use strict';

  describe('provvis Render Service', function () {
    var service;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryProvvis'));
    beforeEach(inject(function (
      provvisRenderService
    ) {
      service = provvisRenderService;
    }));

    it('service and variables should exist', function () {
      expect(service).toBeDefined();
      expect(service.width).toEqual(0);
      expect(service.depth).toEqual(0);
      expect(service.filterMethod).toBeDefined();
      expect(service.timeLineGradientScale).toBeDefined();
    });


    describe('runRender', function () {
      it('runRender is a method', function () {
        expect(angular.isFunction(service.runRender)).toBe(true);
      });
    });
  });
})();

