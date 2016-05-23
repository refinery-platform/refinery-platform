'use strict';

describe('replaceWhiteSpaceWithHyphen.module: unit tests', function () {
  var module;

  beforeEach(function () {
    module = angular.module('replaceWhiteSpaceWithHyphen');
  });

  describe('Module', function () {
    it('should be registered', function () {
      expect(module).not.toEqual(null);
    });
  });
});

describe('Filter: replaceWhiteSpaceWithHyphen', function () {
  var filter;

  beforeEach(function () {
    module('refineryApp');
    module('replaceWhiteSpaceWithHyphen');

    inject(function ($filter) {
      filter = $filter('replaceWhiteSpaceWithHyphen');
    });
  });

  it('filter should exist', function () {
    expect(filter).toBeDefined();
  });

  it('should return param with spaces replaced with hyphens', function () {
    expect(filter('Analysis Out')).toBe('Analysis-Out');
    expect(filter('The Analysis Output Test')).toBe('The-Analysis-Output-Test');
    expect(filter('Title')).toBe('Title');
    expect(filter('')).toBe('');
    expect(filter(' ')).toBe('-');
  });
});
