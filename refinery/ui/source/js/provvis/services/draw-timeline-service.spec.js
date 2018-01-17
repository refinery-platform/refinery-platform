(function () {
  'use strict';

  describe('provvis Draw Timeline Service', function () {
    var service;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryProvvis'));
    beforeEach(inject(function (
      provvisDrawTimelineService
    ) {
      service = provvisDrawTimelineService;
    }));

    it('service and variables should exist', function () {
      expect(service).toBeDefined();
    });

    describe('drawTimelineView', function () {
      it('drawTimelineView is a method', function () {
        expect(angular.isFunction(service.drawTimelineView)).toBe(true);
      });
    });
  });
})();

