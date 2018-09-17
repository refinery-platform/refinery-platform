(function () {
  'use strict';

  describe('provvis Helpers Service', function () {
    var service;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryProvvis'));
    beforeEach(inject(function (
      provvisHelpersService
    ) {
      service = provvisHelpersService;
    }));

    it('service and variables should exist', function () {
      expect(service).toBeDefined();
    });

    describe('bfs', function () {
      it('bfs is a method', function () {
        expect(angular.isFunction(service.bfs)).toBe(true);
      });
    });

    describe('compareMaps', function () {
      it('compareMaps is a method', function () {
        expect(angular.isFunction(service.compareMaps)).toBe(true);
      });
    });

    describe('concatDomClassElements', function () {
      it('concatDomClassElements is a method', function () {
        expect(angular.isFunction(service.concatDomClassElements)).toBe(true);
      });
    });

    describe('customTimeFormat', function () {
      it('customTimeFormat is a method', function () {
        expect(angular.isFunction(service.customTimeFormat)).toBe(true);
      });
    });

    describe('fitGraphToWindow', function () {
      it('fitGraphToWindow is a method', function () {
        expect(angular.isFunction(service.fitGraphToWindow)).toBe(true);
      });
    });

    describe('getLayerPredCount', function () {
      it('getLayerPredCount is a method', function () {
        expect(angular.isFunction(service.getLayerPredCount)).toBe(true);
      });
    });

    describe('getLayerSuccCount', function () {
      it('getLayerSuccCount is a method', function () {
        expect(angular.isFunction(service.getLayerSuccCount)).toBe(true);
      });
    });

    describe('getWfNameByNode', function () {
      it('getWfNameByNode is a method', function () {
        expect(angular.isFunction(service.getWfNameByNode)).toBe(true);
      });
    });

    describe('hideChildNodes', function () {
      it('hideChildNodes is a method', function () {
        expect(angular.isFunction(service.hideChildNodes)).toBe(true);
      });
    });

    describe('parseISOTimeFormat', function () {
      it('parseISOTimeFormat is a method', function () {
        expect(angular.isFunction(service.parseISOTimeFormat)).toBe(true);
      });
    });

    describe('propagateNodeSelection', function () {
      it('propagateNodeSelection is a method', function () {
        expect(angular.isFunction(service.propagateNodeSelection)).toBe(true);
      });
    });
  });
})();

