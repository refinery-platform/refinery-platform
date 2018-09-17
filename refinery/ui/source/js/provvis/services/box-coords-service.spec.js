(function () {
  'use strict';

  describe('provvis Box Coords Service', function () {
    var service;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryProvvis'));
    beforeEach(inject(function (
      provvisBoxCoordsService
    ) {
      service = provvisBoxCoordsService;
    }));

    it('service and variables should exist', function () {
      expect(service).toBeDefined();
    });

    describe('getABBoxCoords', function () {
      it('getABBoxCoords is a method', function () {
        expect(angular.isFunction(service.getABBoxCoords)).toBe(true);
      });
    });

    describe('getWFBBoxCoords', function () {
      it('getWFBBoxCoords is a method', function () {
        expect(angular.isFunction(service.getWFBBoxCoords)).toBe(true);
      });
    });

    describe('getVisibleNodeCoords', function () {
      it('getVisibleNodeCoords is a method', function () {
        expect(angular.isFunction(service.getVisibleNodeCoords)).toBe(true);
      });
    });
  });
})();

