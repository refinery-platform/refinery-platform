'use strict';

describe('refineryCollaboration.module: unit tests', function () {
  var module;

  beforeEach(function () {
    module = angular.module('refineryCollaboration');
  });

  describe('Module', function () {
    it('should be registered', function () {
      expect(module).not.toEqual(null);
    });
  });
});
