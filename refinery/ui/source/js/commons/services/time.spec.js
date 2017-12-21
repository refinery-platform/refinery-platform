(function () {
  'use strict';

  describe('Time Service', function () {
    var service;

    beforeEach(module('refineryApp'));
    beforeEach(inject(function (
      timeService
    ) {
      service = timeService;
    }));

    it('service should exist', function () {
      expect(service).toBeDefined();
    });

    describe('humanizeTimeObj', function () {
      var mockService;
      beforeEach(inject(function (
        humanize
      ) {
        mockService = spyOn(humanize, 'relativeTime');
      }));
      it('humanizeTimeObj is a method', function () {
        expect(angular.isFunction(service.humanizeTimeObj)).toBe(true);
      });
      it('humanizeTimeObj calls on correct humanize method', function () {
        service.humanizeTimeObj('2017-12-14T16:15:02.409486Z');
        expect(mockService).toHaveBeenCalled();
      });
    });
  });
})();

