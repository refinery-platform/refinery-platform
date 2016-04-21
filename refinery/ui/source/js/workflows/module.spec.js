'use strict';

describe('RefineryWorkflows.module: unit tests', function () {
  var module;

  beforeEach(function () {
    module = angular.module('refineryWorkflows');
  });

  describe('Module', function () {
    it('should be registered', function () {
      expect(!!module).toEqual(true);
    });
  });
});
