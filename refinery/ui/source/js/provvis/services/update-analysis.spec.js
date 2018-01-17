(function () {
  'use strict';

  describe('provvis Update Node Links Service', function () {
    var service;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryProvvis'));
    beforeEach(inject(function (
      provvisUpdateAnalysisService
    ) {
      service = provvisUpdateAnalysisService;
    }));

    it('service and variables should exist', function () {
      expect(service).toBeDefined();
    });


    describe('updateAnalysisLinks', function () {
      it('updateAnalysisLinks is a method', function () {
        expect(angular.isFunction(service.updateAnalysisLinks)).toBe(true);
      });
    });

    describe('updateAnalysisNodes', function () {
      it('updateAnalysisNodes is a method', function () {
        expect(angular.isFunction(service.updateAnalysisNodes)).toBe(true);
      });
    });
  });
})();

