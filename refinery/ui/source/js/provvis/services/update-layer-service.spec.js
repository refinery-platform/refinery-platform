(function () {
  'use strict';

  describe('provvis Update Layer Service', function () {
    var service;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryProvvis'));
    beforeEach(inject(function (
      provvisUpdateLayerService
    ) {
      service = provvisUpdateLayerService;
    }));

    it('service and variables should exist', function () {
      expect(service).toBeDefined();
    });


    describe('updateLayerLinks', function () {
      it('updateLayerLinks is a method', function () {
        expect(angular.isFunction(service.updateLayerLinks)).toBe(true);
      });
    });

    describe('updateLayerNodes', function () {
      it('updateLayerNodes is a method', function () {
        expect(angular.isFunction(service.updateLayerNodes)).toBe(true);
      });
    });
  });
})();

