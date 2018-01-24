(function () {
  'use strict';

  describe('provvis Tooltip Service', function () {
    var service;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryProvvis'));
    beforeEach(inject(function (
      provvisToolbarService
    ) {
      service = provvisToolbarService;
    }));

    it('service and variables should exist', function () {
      expect(service).toBeDefined();
    });


    describe('handleToolbar', function () {
      it('handleToolbar is a method', function () {
        expect(angular.isFunction(service.handleToolbar)).toBe(true);
      });
    });
  });
})();

