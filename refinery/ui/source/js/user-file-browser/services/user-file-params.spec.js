(function () {
  'use strict';

  describe('User File Params Service', function () {
    var service;
    var sortService;

    beforeEach(module('refineryApp'));
    beforeEach(inject(function (userFileParamsService, userFileSortsService) {
      service = userFileParamsService;
      sortService = userFileSortsService;
    }));

    it('service and variables should exist', function () {
      expect(service).toBeDefined();
      expect(Object.keys(service)).toEqual(['limit', 'filter_attribute', 'sort']);
    });

    it('return default limit', function () {
      expect(service.limit).toEqual(100);
    });

    it('params sort returns character suffix', function () {
      var mockFields = [{ name: 'technology', direction: 'desc' }];
      angular.copy(mockFields, sortService.fields);
      expect(service.sort()).toEqual(['technology_Characteristics_generic_s desc']);
    });

    it('params sort does not returns character suffix for name field', function () {
      var mockFields = [{ name: 'name', direction: 'asc' }];
      angular.copy(mockFields, sortService.fields);
      expect(service.sort()).toEqual(['name asc']);
    });
  });
})();
