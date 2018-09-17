(function () {
  'use strict';

  describe('provvis Tooltip Service', function () {
    var service;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryProvvis'));
    beforeEach(inject(function (
      provvisTooltipService
    ) {
      service = provvisTooltipService;
    }));

    it('service and variables should exist', function () {
      expect(service).toBeDefined();
    });


    describe('handleTooltips', function () {
      it('handleTooltips is a method', function () {
        expect(angular.isFunction(service.handleTooltips)).toBe(true);
      });
    });

    describe('hideTooltip', function () {
      it('hideTooltip is a method', function () {
        expect(angular.isFunction(service.hideTooltip)).toBe(true);
      });
    });

    describe('showTooltip', function () {
      it('showTooltip is a method', function () {
        expect(angular.isFunction(service.showTooltip)).toBe(true);
      });
    });
  });
})();

