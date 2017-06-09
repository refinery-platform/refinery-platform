(function () {
  'use strict';

  describe('Selected-Filter-Service', function () {
    var service;
    var location;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryFileBrowser'));
    beforeEach(inject(function ($location, selectedFilterService) {
      service = selectedFilterService;
      location = $location;
      spyOn(location, 'search');
    }));

    it('service variables should exist', function () {
      expect(service).toBeDefined();
      expect(service.attributeSelectedFields).toEqual({});
    });

    it('all methods exist', function () {
      expect(angular.isFunction(service.updateSelectedFilters)).toBe(true);
    });

    it('updateSelectedFilters handles blank values', function () {
      var response = service.updateSelectedFilters({}, {}, {});
      expect(response).toEqual({});
    });

    it('updateSelectedFilters handles new attribute filter selected', function () {
      var selectedField = { February: true };
      var name = 'Month_Characteristics_10_5_s';
      var field = 'February';
      var encodeAttribute = '{"Month_Characteristics_10_5_s":"February"}';
      var response = service.updateSelectedFilters(selectedField, name, field);
      expect(response).toEqual({ Month_Characteristics_10_5_s: [field] });
      expect(location.search).toHaveBeenCalledWith(encodeAttribute, selectedField[field]);
    });

    it('updateSelectedFilters handles adding new field', function () {
      service.attributeSelectedFields = {
        Month_Characteristics_10_5_s: ['January', 'March', 'April'],
        REFINERY_WORKFLOW_OUTPUT_10_5_s: ['1', '2']
      };
      var selectedField = {
        January: true,
        March: true,
        April: true,
        February: true };
      var name = 'Month_Characteristics_10_5_s';
      var field = 'February';
      var encodeAttribute = '{"Month_Characteristics_10_5_s":"February"}';
      var response = service.updateSelectedFilters(selectedField, name, field);
      expect(response).toEqual({
        Month_Characteristics_10_5_s: ['January', 'March', 'April', 'February'],
        REFINERY_WORKFLOW_OUTPUT_10_5_s: ['1', '2']
      });
      expect(location.search).toHaveBeenCalledWith(encodeAttribute, selectedField[field]);
    });

    it('updateSelectedFilters deletes field', function () {
      service.attributeSelectedFields = {
        Month_Characteristics_10_5_s: ['January', 'March', 'April'],
        REFINERY_WORKFLOW_OUTPUT_10_5_s: ['1', '2']
      };
      var selectedField = {
        January: true,
        March: true,
        April: true,
        February: false };
      var name = 'Month_Characteristics_10_5_s';
      var encodeAttribute = '{"Month_Characteristics_10_5_s":"February"}';
      var field = 'February';
      var response = service.updateSelectedFilters(selectedField, name, field);
      expect(response).toEqual({
        Month_Characteristics_10_5_s: ['January', 'March', 'April'],
        REFINERY_WORKFLOW_OUTPUT_10_5_s: ['1', '2']
      });
      expect(location.search).toHaveBeenCalledWith(encodeAttribute, null);
    });

    it('resetAttributeFilter calls updateSelectedFilters', function () {
      service.attributeSelectedFields = {
        Month_Characteristics_10_5_s: ['January', 'March', 'April'],
        REFINERY_WORKFLOW_OUTPUT_10_5_s: ['1', '2']
      };
      var selectedField = {
        January: false,
        March: false,
        April: false,
        1: false,
        2: false };
      spyOn(service, 'updateSelectedFilters');

      service.resetAttributeFilter(selectedField);
      expect(service.updateSelectedFilters.calls.count()).toEqual(
        Object.keys(selectedField).length
      );
    });

    it('resetAttributeFilter integration test, updates attributeSelectedFields', function () {
      service.attributeSelectedFields = {
        Month_Characteristics_10_5_s: ['January', 'March', 'April'],
        REFINERY_WORKFLOW_OUTPUT_10_5_s: ['1', '2']
      };

      var selectedField = {
        January: false,
        March: false,
        April: false,
        1: false,
        2: false };

      service.resetAttributeFilter(selectedField);
      expect(service.attributeSelectedFields).toEqual({});
      expect(location.search.calls.count()).toEqual(Object.keys(selectedField).length);
    });
  });
})();
