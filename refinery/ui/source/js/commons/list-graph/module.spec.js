'use strict';

describe('ListGraph.module: unit tests', function () {
  var module;

  beforeEach(function () {
    module = angular.module('listGraph');
  });

  describe('Module', function () {
    it('should be registered', function () {
      expect(!!module).toEqual(true);
    });
  });
});
