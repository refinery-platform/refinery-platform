(function () {
  'use strict';

  describe('provvis Handle Collapse Service', function () {
    var service;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryProvvis'));
    beforeEach(inject(function (
      provvisHandleCollapseService
    ) {
      service = provvisHandleCollapseService;
    }));

    it('service and variables should exist', function () {
      expect(service).toBeDefined();
    });

    describe('handleCollapseExpandNode', function () {
      it('handleCollapseExpandNode is a method', function () {
        expect(angular.isFunction(service.handleCollapseExpandNode)).toBe(true);
      });
    });

    describe('updateNodeDoi', function () {
      it('updateNodeDoi is a method', function () {
        expect(angular.isFunction(service.updateNodeDoi)).toBe(true);
      });
    });
  });
})();

