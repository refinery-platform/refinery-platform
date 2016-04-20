'use strict';

describe('Filter: AnalysisMonitorFormatMilliTime', function () {
  var filter;

  beforeEach(function () {
    module('refineryApp');

    inject(function ($filter) {
      filter = $filter('analysisMonitorFormatMilliTime');
    });
  });

  it('filter should exist', function () {
    expect(filter).toBeDefined();
  });

  it('convert milli-seconds to days, weeks, hours, secs string', function () {
    expect(filter('259200000')).toBe('3 days ');
    expect(filter('86400')).toBe('1 min 26 secs ');
    expect(filter('546789321')).toBe('6 days 7 hours 53 mins 9 secs ');
    expect(filter('1234567')).toBe('20 mins 34 secs ');
    expect(filter('2500')).toBe('2 secs ');
    expect(filter('-2500')).toBe('');
    expect(filter('')).toBe('');
  });
});
