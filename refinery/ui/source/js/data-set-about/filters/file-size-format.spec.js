'use strict';

describe('Filter: file-size-format', function () {
  var filter;

  beforeEach(function () {
    module('refineryApp');
    module('refineryDataSetAbout');

    inject(function ($filter) {
      filter = $filter('fileSizeFormat');
    });
  });

  it('filter should exist', function () {
    expect(filter).toBeDefined();
  });

  it('should return correct number and file type', function () {
    expect(filter(0)).toBe('0 Bytes');
    expect(filter(1000)).toBe('1000 Bytes');
    expect(filter(4999)).toBe('4.9 Kb');
    expect(filter(599990900)).toBe('572.2 Mb');
    expect(filter(599990900000)).toBe('558.8 Gb');
    expect(filter(599990900000000)).toBe('545.7 Tb');
  });

  it('should return correct number and file type, even if str', function () {
    expect(filter('0')).toBe('0 Bytes');
    expect(filter('1000')).toBe('1000 Bytes');
    expect(filter('4999')).toBe('4.9 Kb');
    expect(filter('599990900')).toBe('572.2 Mb');
    expect(filter('599990900000')).toBe('558.8 Gb');
    expect(filter('599990900000000')).toBe('545.7 Tb');
  });

  it('should return param if undefined or not a number', function () {
    var undefinedParam = undefined;
    expect(filter('')).toBe('');
    expect(filter('notANumber')).toBe('notANumber');
    expect(filter(undefinedParam)).toBe(undefined);
  });
});
