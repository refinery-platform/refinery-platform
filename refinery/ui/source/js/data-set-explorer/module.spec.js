'use strict';

describe('RefineryDataSetExplorer.module: unit tests', function () {
  var module;

  beforeEach(function () {
    module = angular.module('refineryDataSetExplorer');
  });

  describe('Module', function () {
    it('should be registered', function () {
      expect(!!module).toEqual(true);
    });
  });
});
