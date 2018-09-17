(function () {
  'use strict';

  describe('provvis Show Service', function () {
    var service;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryProvvis'));
    beforeEach(inject(function (
      provvisShowService
    ) {
      service = provvisShowService;
    }));

    it('service and variables should exist', function () {
      expect(service).toBeDefined();
    });


    describe('showAllAnalyses', function () {
      it('showAllAnalyses is a method', function () {
        expect(angular.isFunction(service.showAllAnalyses)).toBe(true);
      });
    });

    describe('showAllLayers', function () {
      it('showAllLayers is a method', function () {
        expect(angular.isFunction(service.showAllLayers)).toBe(true);
      });
    });

    describe('showAllSubanalyses', function () {
      it('showAllSubanalyses is a method', function () {
        expect(angular.isFunction(service.showAllSubanalyses)).toBe(true);
      });
    });

    describe('showAllWorkflows', function () {
      it('showAllWorkflows is a method', function () {
        expect(angular.isFunction(service.showAllWorkflows)).toBe(true);
      });
    });
  });
})();

