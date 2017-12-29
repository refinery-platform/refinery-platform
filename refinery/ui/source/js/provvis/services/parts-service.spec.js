(function () {
  'use strict';

  describe('provvis Parts Service', function () {
    var service;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryProvvis'));
    beforeEach(inject(function (
      provvisPartsService
    ) {
      service = provvisPartsService;
    }));

    it('service and variables should exist', function () {
      expect(service).toBeDefined();
    });
  });
})();

