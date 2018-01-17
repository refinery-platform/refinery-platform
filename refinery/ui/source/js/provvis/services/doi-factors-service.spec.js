(function () {
  'use strict';

  describe('provvis Decl Doi Factors', function () {
    var service;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryProvvis'));
    beforeEach(inject(function (
      provvisDeclDoiFactors
    ) {
      service = provvisDeclDoiFactors;
    }));

    it('service and variables should exist', function () {
      expect(service).toBeDefined();
      expect(service.factors).toBeDefined();
    });

    it('factor.filtered should be initialized', function () {
      expect(service.factors.filtered.label).toEqual('filtered');
      expect(service.factors.filtered.value).toEqual(0.2);
      expect(service.factors.filtered.masked).toEqual(true);
    });

    it('factor.selected should be initialized', function () {
      expect(service.factors.selected.label).toEqual('selected');
      expect(service.factors.selected.value).toEqual(0.2);
      expect(service.factors.selected.masked).toEqual(true);
    });

    it('factor.highlighted should be initialized', function () {
      expect(service.factors.highlighted.label).toEqual('highlighted');
      expect(service.factors.highlighted.value).toEqual(0.2);
      expect(service.factors.highlighted.masked).toEqual(true);
    });

    it('factor.time should be initialized', function () {
      expect(service.factors.time.label).toEqual('time');
      expect(service.factors.time.value).toEqual(0.2);
      expect(service.factors.time.masked).toEqual(true);
    });

    it('factor.diff should be initialized', function () {
      expect(service.factors.diff.label).toEqual('diff');
      expect(service.factors.diff.value).toEqual(0.2);
      expect(service.factors.diff.masked).toEqual(true);
    });

    describe('get', function () {
      it('get is a method', function () {
        expect(angular.isFunction(service.get)).toEqual(true);
      });

      it('get returns value for filtered', function () {
        expect(service.get('filtered')).toEqual(0.2);
      });

      it('get returns value for selected', function () {
        expect(service.get('selected')).toEqual(0.2);
      });

      it('get returns value for highlighted', function () {
        expect(service.get('highlighted')).toEqual(0.2);
      });

      it('get returns value for time', function () {
        expect(service.get('time')).toEqual(0.2);
      });

      it('get returns value for diff', function () {
        expect(service.get('diff')).toEqual(0.2);
      });
    });

    describe('isMasked', function () {
      it('isMasked is a method', function () {
        expect(angular.isFunction(service.isMasked)).toEqual(true);
      });

      it('get returns value for filtered', function () {
        expect(service.isMasked('filtered')).toEqual(true);
      });

      it('get returns value for selected', function () {
        expect(service.isMasked('selected')).toEqual(true);
      });

      it('get returns value for highlighted', function () {
        expect(service.isMasked('highlighted')).toEqual(true);
      });

      it('get returns value for time', function () {
        expect(service.isMasked('time')).toEqual(true);
      });

      it('get returns value for diff', function () {
        expect(service.isMasked('diff')).toEqual(true);
      });
    });

    describe('set', function () {
      var value = 2;
      var isMasked = false;

      it('set is a method', function () {
        expect(angular.isFunction(service.set)).toBe(true);
      });

      it('set property for filtered', function () {
        service.set('filtered', value, isMasked);
        expect(service.factors.filtered.value).toEqual(value);
        expect(service.factors.filtered.masked).toEqual(isMasked);
      });

      it('set property for selected', function () {
        service.set('selected', value, isMasked);
        expect(service.factors.selected.value).toEqual(value);
        expect(service.factors.selected.masked).toEqual(isMasked);
      });

      it('set property for highlighted', function () {
        service.set('highlighted', value, isMasked);
        expect(service.factors.highlighted.value).toEqual(value);
        expect(service.factors.highlighted.masked).toEqual(isMasked);
      });

      it('set property for time', function () {
        service.set('time', value, isMasked);
        expect(service.factors.time.value).toEqual(value);
        expect(service.factors.time.masked).toEqual(isMasked);
      });

      it('set property for diff', function () {
        service.set('diff', value, isMasked);
        expect(service.factors.diff.value).toEqual(value);
        expect(service.factors.diff.masked).toEqual(isMasked);
      });
    });
  });
})();

