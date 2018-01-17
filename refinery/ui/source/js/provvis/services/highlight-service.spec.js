(function () {
  'use strict';

  describe('provvis Highlight Service', function () {
    var service;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryProvvis'));
    beforeEach(inject(function (
      provvisHighlightService
    ) {
      service = provvisHighlightService;
    }));

    it('service and variables should exist', function () {
      expect(service).toBeDefined();
    });

    describe('clearHighlighting', function () {
      it('clearHighlighting is a method', function () {
        expect(angular.isFunction(service.clearHighlighting)).toBe(true);
      });
    });

    describe('handlePathHighlighting', function () {
      it('handlePathHighlighting is a method', function () {
        expect(angular.isFunction(service.handlePathHighlighting)).toBe(true);
      });
    });

    describe('highlightPredPath', function () {
      it('highlightPredPath is a method', function () {
        expect(angular.isFunction(service.highlightPredPath)).toBe(true);
      });
    });

    describe('highlightSuccPath', function () {
      it('highlightSuccPath is a method', function () {
        expect(angular.isFunction(service.highlightSuccPath)).toBe(true);
      });
    });
  });
})();

