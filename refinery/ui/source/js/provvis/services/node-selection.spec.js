(function () {
  'use strict';

  describe('provvis Node Selection Service', function () {
    var service;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryProvvis'));
    beforeEach(inject(function (
      provvisNodeSelectionService
    ) {
      service = provvisNodeSelectionService;
    }));

    it('service and variables should exist', function () {
      expect(service).toBeDefined();
    });

    describe('clearNodeSelection', function () {
      it('clearNodeSelection is a method', function () {
        expect(angular.isFunction(service.clearNodeSelection)).toBe(true);
      });
    });

    describe('handleNodeSelection', function () {
      it('handleNodeSelection is a method', function () {
        expect(angular.isFunction(service.handleNodeSelection)).toBe(true);
      });
    });
  });
})();

