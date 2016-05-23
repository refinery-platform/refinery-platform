'use strict';

describe('Filter: AnalysisStatusTitle', function () {
  var filter;
  var statusObj = {
    SUCCESS: 'Analysis successful.',
    FAILURE: 'Analysis failed.',
    RUNNING: 'Analysis is running.',
    INITIALIZED: 'Analysis is initializing.',
    UNKNOWN: 'Analysis status unknown.'
  };

  beforeEach(function () {
    module('refineryApp');

    inject(function ($filter) {
      filter = $filter('analysisStatusTitle');
    });
  });

  it('filter should exist', function () {
    expect(filter).toBeDefined();
  });

  it('should return correct status depending on state', function () {
    var keys = Object.keys(statusObj);
    for (var i = keys.length; i--;) {
      expect(filter(keys[i])).toBe(statusObj[keys[i]]);
    }
    expect(filter('')).toBe('Analysis status unknown.');
  });
});
