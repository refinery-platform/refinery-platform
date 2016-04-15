'use strict';

describe('refinerFileBrowser.module: unit tests', function () {
  var module;

  beforeEach(function () {
    module = angular.module('refineryFileBrowser');
  });

  describe('Module', function () {
    it('should be registered', function () {
      expect(module).not.toEqual(null);
    });
  });
});
