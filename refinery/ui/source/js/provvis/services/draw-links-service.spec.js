(function () {
  'use strict';

  describe('provvis Draw Links Service', function () {
    var service;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryProvvis'));
    beforeEach(inject(function (
      provvisDrawLinksService
    ) {
      service = provvisDrawLinksService;
    }));

    it('service and variables should exist', function () {
      expect(service).toBeDefined();
    });

    describe('drawBezierLink', function () {
      it('drawBezierLink is a method', function () {
        expect(angular.isFunction(service.drawBezierLink)).toBe(true);
      });
    });

    describe('drawBezierLink1', function () {
      it('drawBezierLink1 is a method', function () {
        expect(angular.isFunction(service.drawBezierLink1)).toBe(true);
      });
    });

    describe('drawBezierLink2', function () {
      it('drawBezierLink2 is a method', function () {
        expect(angular.isFunction(service.drawBezierLink2)).toBe(true);
      });
    });

    describe('drawBezierLink3', function () {
      it('drawBezierLink3 is a method', function () {
        expect(angular.isFunction(service.drawBezierLink3)).toBe(true);
      });
    });

    describe('drawNodes', function () {
      it('drawNodes is a method', function () {
        expect(angular.isFunction(service.drawNodes)).toBe(true);
      });
    });

    describe('drawStraightLink', function () {
      it('drawStraightLink is a method', function () {
        expect(angular.isFunction(service.drawStraightLink)).toBe(true);
      });
    });

    describe('drawSubanalysisLinks', function () {
      it('drawSubanalysisLinks is a method', function () {
        expect(angular.isFunction(service.drawSubanalysisLinks)).toBe(true);
      });
    });

    describe('drawSubanalysisNodes', function () {
      it('drawSubanalysisNodes is a method', function () {
        expect(angular.isFunction(service.drawSubanalysisNodes)).toBe(true);
      });
    });
  });
})();

