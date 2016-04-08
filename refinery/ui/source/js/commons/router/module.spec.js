'use strict';

describe('RefineryRouter.module: unit tests', function () {
  var module;

  beforeEach(function () {
    module = angular.module('refineryRouter');
  });

  describe('Module', function () {
    it('should be registered', function () {
      expect(!!module).toEqual(true);
    });
  });
});
