'use strict';

describe('refinerDataSetAbout.module: unit tests', function () {
  var module;

  beforeEach(function () {
    module = angular.module('refineryDataSetAbout');
  });

  describe('Module', function () {
    it('should be registered', function () {
      expect(module).not.toEqual(null);
    });
  });
});
