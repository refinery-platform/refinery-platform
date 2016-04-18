'use strict';

describe('refinerAnalysisMonitor.module: unit tests', function () {
  var module;

  beforeEach(function () {
    module = angular.module('refineryAnalysisMonitor');
  });

  describe('Module', function () {
    it('should be registered', function () {
      expect(module).not.toEqual(null);
    });
  });
});
