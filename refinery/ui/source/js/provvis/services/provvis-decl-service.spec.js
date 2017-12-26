(function () {
  'use strict';

  describe('provvis Decl Service', function () {
    var service;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryProvvis'));
    beforeEach(inject(function (
      provvisDeclService
    ) {
      service = provvisDeclService;
    }));

    it('service and variables should exist', function () {
      expect(service).toBeDefined();
    });

    describe('Analysis', function () {
      it('Analysis is a method', function () {
        expect(angular.isFunction(service.Analysis)).toBe(true);
      });
    });

    describe('BaseNode', function () {
      it('BaseNode is a method', function () {
        expect(angular.isFunction(service.BaseNode)).toBe(true);
      });
    });

    describe('Layer', function () {
      it('Layer is a method', function () {
        expect(angular.isFunction(service.Layer)).toBe(true);
      });
    });

    describe('Link', function () {
      it('Link is a method', function () {
        expect(angular.isFunction(service.Link)).toBe(true);
      });
    });

    describe('Motif', function () {
      it('Motif is a method', function () {
        expect(angular.isFunction(service.Motif)).toBe(true);
      });
    });

    describe('Node', function () {
      it('Node is a method', function () {
        expect(angular.isFunction(service.Node)).toBe(true);
      });
    });

    describe('ProvGraph', function () {
      it('ProvGraph is a method', function () {
        expect(angular.isFunction(service.ProvGraph)).toBe(true);
      });
    });

    describe('ProvVis', function () {
      it('ProvVis is a method', function () {
        expect(angular.isFunction(service.ProvVis)).toBe(true);
      });
    });

    describe('Subanalysis', function () {
      it('Subanalysis is a method', function () {
        expect(angular.isFunction(service.Subanalysis)).toBe(true);
      });
    });
  });
})();

