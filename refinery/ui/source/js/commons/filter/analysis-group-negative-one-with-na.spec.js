'use strict';

describe('Filter: Negative One With Not Available Spec', function () {
  var filter;

  beforeEach(function () {
    module('refineryApp');
    inject(function ($filter) {
      filter = $filter('analysisGroupNegativeOneWithNA');
    });
  });

  it('filter should exist', function () {
    expect(filter).toBeDefined();
  });

  it('should return param', function () {
    expect(filter('', '')).toBe('');
    expect(filter(2, 'Analysis Group')).toBe(2);
    expect(filter('-1', 'Title')).toBe('-1');
  });

  it('should return N/A ', function () {
    expect(filter(-1, 'Analysis Group')).toBe('N/A');
    expect(filter('-1', 'Analysis Group')).toBe('N/A');
  });
});
