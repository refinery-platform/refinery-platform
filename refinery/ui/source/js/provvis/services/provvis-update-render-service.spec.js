(function () {
  'use strict';

  describe('provvis Update Render Service', function () {
    var service;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryProvvis'));
    beforeEach(inject(function (
      provvisUpdateRenderService
    ) {
      service = provvisUpdateRenderService;
    }));

    it('service and variables should exist', function () {
      expect(service).toBeDefined();
    });


    describe('runRenderUpdate', function () {
      it('runRenderUpdate is a method', function () {
        expect(angular.isFunction(service.runRenderUpdate)).toBe(true);
      });
    });
  });
})();

