'use strict';

describe('Filter: camelCaseToTitle', function () {
  var filter;

  beforeEach(function () {
    module('refineryApp');
    module('refineryAnalysisMonitor');

    inject(function ($filter) {
      filter = $filter('camelCaseToTitle');
    });
  });

  it('filter should exist', function () {
    expect(filter).toBeDefined();
  });

  it('should return param with spaces replaced with hyphens', function () {
    expect(filter('galaxyOutput')).toBe('Galaxy Output');
    expect(filter('theAnalysisOutputTest')).toBe('The Analysis Output Test');
    expect(filter('Title')).toBe('Title');
    expect(filter('title')).toBe('Title');
    expect(filter('')).toBe('');
    expect(filter(' ')).toBe(' ');
  });
});
