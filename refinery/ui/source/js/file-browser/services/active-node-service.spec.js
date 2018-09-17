(function () {
  'use strict';

  describe('Active-Node-Service', function () {
    var service;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryFileBrowser'));
    beforeEach(inject(function (
      activeNodeService
    ) {
      service = activeNodeService;
    }));

    it('service variables should exist', function () {
      expect(service).toBeDefined();
      expect(service.activeNodeRow).toEqual({});
      expect(service.selectionObj).toEqual({});
    });
  });
})();
