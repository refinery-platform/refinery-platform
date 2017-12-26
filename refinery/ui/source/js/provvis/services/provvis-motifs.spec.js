(function () {
  'use strict';

  describe('provvis Motifs Service', function () {
    var service;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryProvvis'));
    beforeEach(inject(function (
      provvisMotifsService
    ) {
      service = provvisMotifsService;
    }));

    it('service and variables should exist', function () {
      expect(service).toBeDefined();
    });


    describe('runMotifs', function () {
      it('runMotifs is a method', function () {
        expect(angular.isFunction(service.runMotifs)).toBe(true);
      });
    });
  });
})();

