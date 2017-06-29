(function () {
  'use strict';

  describe('User File Browser Grid Options', function () {
    var service;

    beforeEach(function () {
      module('refineryApp');

      inject(function ($injector) {
        service = $injector.get('gridOptionsService');
      });
    });

    describe('Service', function () {
      it('should be defined', function () {
        expect(service).toBeDefined();
      });

      it('should be an object', function () {
        // TODO: Is this right? or should it be a function?
        expect(typeof service).toEqual('object');
      });

      it('should have expected fields', function () {
        // TODO
      });
    });
  });
})();

