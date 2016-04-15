'use strict';

describe('Colors.module: unit tests', function () {
  var module;

  beforeEach(function () {
    module = angular.module('colors');
  });

  describe('Module', function () {
    it('should be registered', function () {
      expect(!!module).toEqual(true);
    });
  });
});
