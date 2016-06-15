'use strict';

describe('Filter: isaArchiveName', function () {
  var filter;

  beforeEach(function () {
    module('refineryApp');
    module('refineryDataSetAbout');

    inject(function ($filter) {
      filter = $filter('isaArchiveName');
    });
  });

  it('filter should exist', function () {
    expect(filter).toBeDefined();
  });

  it('should return the last portion of file url', function () {
    var undefinedParam = undefined;
    expect(filter('')).toBe('');
    expect(filter('/media/file_store/94/70/rfc-test_4_LYaeGAD.zip')).toBe('rfc-test_4_LYaeGAD.zip');
    expect(filter('/rfc-test_4')).toBe('rfc-test_4');
    expect(filter(undefinedParam)).toBe(undefined);
    expect(filter('notAUrlName')).toBe('notAUrlName');
  });
});
