'use strict';

describe('Selected-Filter-Service', function () {
  var service;
  var location;

  beforeEach(module('refineryApp'));
  beforeEach(module('refineryFileBrowser'));
  beforeEach(inject(function (_selectedFilterService_, _$location_) {
    service = _selectedFilterService_;
    location = _$location_;
    spyOn(location, 'search');
  }));

  it('service variables should exist', function () {
    expect(service).toBeDefined();
    expect(service.selectedFieldList).toEqual({});
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
    var response = service.updateSelectedFilters(selectedField, name, field);
    expect(response).toEqual({ Month_Characteristics_10_5_s: [field] });
    expect(location.search).toHaveBeenCalledWith(field, selectedField[field]);
  });

  it('updateSelectedFilters handles adding new field', function () {
    service.selectedFieldList = {
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
    var response = service.updateSelectedFilters(selectedField, name, field);
    expect(response).toEqual({
      Month_Characteristics_10_5_s: ['January', 'March', 'April', 'February'],
      REFINERY_WORKFLOW_OUTPUT_10_5_s: ['1', '2']
    });
    expect(location.search).toHaveBeenCalledWith(field, selectedField[field]);
  });

  it('updateSelectedFilters deletes field', function () {
    service.selectedFieldList = {
      Month_Characteristics_10_5_s: ['January', 'March', 'April'],
      REFINERY_WORKFLOW_OUTPUT_10_5_s: ['1', '2']
    };
    var selectedField = {
      January: true,
      March: true,
      April: true,
      February: false };
    var name = 'Month_Characteristics_10_5_s';
    var field = 'February';
    var response = service.updateSelectedFilters(selectedField, name, field);
    expect(response).toEqual({
      Month_Characteristics_10_5_s: ['January', 'March', 'April'],
      REFINERY_WORKFLOW_OUTPUT_10_5_s: ['1', '2']
    });
    expect(location.search).toHaveBeenCalledWith(field, null);
  });
});
