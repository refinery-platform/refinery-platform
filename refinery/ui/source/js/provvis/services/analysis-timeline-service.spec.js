(function () {
  'use strict';

  describe('provvis Analysis Timeline Service', function () {
    var service;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryProvvis'));
    beforeEach(inject(function (
      provvisAnalysisTimelineService
    ) {
      service = provvisAnalysisTimelineService;
    }));

    it('service and variables should exist', function () {
      expect(service).toBeDefined();
    });

    describe('createAnalysistimeColorScale', function () {
      it('createAnalysistimeColorScale is a method', function () {
        expect(angular.isFunction(service.createAnalysistimeColorScale)).toBe(true);
      });
    });

    describe('filterAnalysesByTime', function () {
      it('filterAnalysesByTime is a method', function () {
        expect(angular.isFunction(service.filterAnalysesByTime)).toBe(true);
      });
    });
  });
})();

