'use strict';

describe('RefineryDataSetNav.module: unit tests', function () {
  var module;

  beforeEach(function () {
    module = angular.module('refineryDataSetNav');
  });

  describe('Module', function () {
    it('should be registered', function () {
      expect(!!module).toEqual(true);
    });
  });
});
