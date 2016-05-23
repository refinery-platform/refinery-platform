'use strict';

describe('Filter: AnalysisStatusIcon', function () {
  var filter;

  beforeEach(function () {
    module('refineryApp');

    inject(function ($filter) {
      filter = $filter('analysisStatusIcon');
    });
  });

  it('filter should exist', function () {
    expect(filter).toBeDefined();
  });

  it('should return correct status depending on state', function () {
    expect(filter('SUCCESS')).toBe('fa fa-check-circle');
    expect(filter('FAILURE')).toBe('fa fa-exclamation-triangle');
    expect(filter('RUNNING')).toBe('fa fa-cog');
    expect(filter('INITIALIZED')).toBe('fa fa-cog');
    expect(filter('UNKNOWN')).toBe('fa fa-question-circle');
    expect(filter('')).toBe('fa fa-question-circle');
  });
});
