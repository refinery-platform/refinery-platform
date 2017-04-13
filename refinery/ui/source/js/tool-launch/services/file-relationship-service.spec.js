(function () {
  'use strict';

  describe('File Relationship Service', function () {
    var service;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryToolLaunch'));
    beforeEach(inject(function (fileRelationshipService) {
      service = fileRelationshipService;
    }));

    it('service and variables should exist', function () {
      expect(service).toBeDefined();
    });

    it('setGroupCollection is a method', function () {
      expect(angular.isFunction(service.setGroupCollection)).toBe(true);
    });

    it('setNodeSelectCollection is a method', function () {
      expect(angular.isFunction(service.setNodeSelectCollection)).toBe(true);
    });

    it('refreshFileMap is a method', function () {
      expect(angular.isFunction(service.refreshFileMap)).toBe(true);
    });
  });
})();
