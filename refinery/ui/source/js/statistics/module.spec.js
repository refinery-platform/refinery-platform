'use strict';

describe('RefineryStatistics.module: unit tests', function () {
  var module;

  beforeEach(function () {
    module = angular.module('refineryStatistics');
  });

  describe('Module', function () {
    it('should be registered', function () {
      expect(!!module).toEqual(true);
    });
  });
});
