'use strict';

describe('Filter: UTC to Readable Date', function () {
  var filter;

  beforeEach(function () {
    module('refineryApp');

    inject(function ($filter) {
      filter = $filter('utcToReadableDate');
    });
  });

  it('filter should exist', function () {
    expect(filter).toBeDefined();
  });

  it('should return correct jan readable date', function () {
    expect(filter('2018-01-06T11:01:49.791203')).toBe('Jan 6, 2018');
  });

  it('should return correct apr readable date', function () {
    expect(filter('2011-04-10T11:01:49.791203')).toBe('Apr 10, 2011');
  });

  it('should return correct july readable date', function () {
    expect(filter('2022-07-23T11:01:49.791203')).toBe('Jul 23, 2022');
  });

  it('should return correct dec readable date', function () {
    expect(filter('2014-12-31T11:01:49.79120')).toEqual('Dec 31, 2014');
  });

  it('should return an empty str', function () {
    expect(filter('')).toBe('');
  });
});
