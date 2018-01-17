(function () {
  'use strict';

  describe('provvis Update Node Links Service', function () {
    var service;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryProvvis'));
    beforeEach(inject(function (
      provvisUpdateNodeLinksService
    ) {
      service = provvisUpdateNodeLinksService;
    }));

    it('service and variables should exist', function () {
      expect(service).toBeDefined();
    });


    describe('updateLink', function () {
      it('updateLink is a method', function () {
        expect(angular.isFunction(service.updateLink)).toBe(true);
      });
    });

    describe('updateLinkFilter', function () {
      it('updateLinkFilter is a method', function () {
        expect(angular.isFunction(service.updateLinkFilter)).toBe(true);
      });
    });
    describe('updateNode', function () {
      it('updateNode is a method', function () {
        expect(angular.isFunction(service.updateNode)).toBe(true);
      });
    });

    describe('updateNodeAndLink', function () {
      it('updateNodeAndLink is a method', function () {
        expect(angular.isFunction(service.updateNodeAndLink)).toBe(true);
      });
    });

    describe('updateNodeFilter', function () {
      it('updateNodeFilter is a method', function () {
        expect(angular.isFunction(service.updateNodeFilter)).toBe(true);
      });
    });

    describe('updateNodeInfoTab', function () {
      it('updateNodeInfoTab is a method', function () {
        expect(angular.isFunction(service.updateNodeInfoTab)).toBe(true);
      });
    });
  });
})();

