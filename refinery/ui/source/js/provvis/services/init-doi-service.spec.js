(function () {
  'use strict';

  describe('provvis Init DOI Service', function () {
    var service;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryProvvis'));
    beforeEach(inject(function (
      provvisInitDOIService
    ) {
      service = provvisInitDOIService;
    }));

    it('service and variables should exist', function () {
      expect(service).toBeDefined();
    });

    describe('initDoiFilterComponent', function () {
      it('initDoiFilterComponent is a method', function () {
        expect(angular.isFunction(service.initDoiFilterComponent)).toBe(true);
      });
    });

    describe('initDoiTimeComponent', function () {
      it('initDoiTimeComponent is a method', function () {
        expect(angular.isFunction(service.initDoiTimeComponent)).toBe(true);
      });
    });

    describe('initDoiLayerDiffComponent', function () {
      it('initDoiLayerDiffComponent is a method', function () {
        expect(angular.isFunction(service.initDoiLayerDiffComponent)).toBe(true);
      });
    });

    describe('recomputeDOI', function () {
      it('recomputeDOI is a method', function () {
        expect(angular.isFunction(service.recomputeDOI)).toBe(true);
      });
    });
  });
})();

