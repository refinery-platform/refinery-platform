'use strict';

describe('Filter: Negative One With Not Available Spec', function () {
  var filter;

  beforeEach(function () {
    module('refineryApp');
    inject(function ($filter) {
      filter = $filter('analysisGroupNegativeOneWithNotAvailable');
    });
  });

  it('filter should exist', function () {
    expect(filter).toBeDefined();
  });

  it('should return param with non -1 values', function () {
    expect(filter('')).toBe('');
    expect(filter(2)).toBe(2);
    expect(filter('None')).toBe('None');
  });

  it('should return N/A with param === -1', function () {
    expect(filter(-1)).toBe('N/A');
    expect(filter('-1')).toBe('N/A');
  });
});
