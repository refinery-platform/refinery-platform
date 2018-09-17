(function () {
  'use strict';

  describe('provvis Draw DOI Service', function () {
    var service;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryProvvis'));
    beforeEach(inject(function (
      provvisDrawDOIService
    ) {
      service = provvisDrawDOIService;
    }));

    it('service and variables should exist', function () {
      expect(service).toBeDefined();
    });

    describe('drawDoiView', function () {
      it('drawDoiView is a method', function () {
        expect(angular.isFunction(service.drawDoiView)).toBe(true);
      });
    });
  });
})();

