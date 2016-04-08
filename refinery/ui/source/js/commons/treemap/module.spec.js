'use strict';

describe('Treemap.module: unit tests', function () {
  var module;

  beforeEach(function () {
    module = angular.module('treemap');
  });

  describe('Module', function () {
    it('should be registered', function () {
      expect(!!module).toEqual(true);
    });
  });
});
