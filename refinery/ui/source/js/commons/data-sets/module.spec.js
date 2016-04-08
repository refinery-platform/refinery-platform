'use strict';

describe('DataSet.module: unit tests', function () {
  var module;

  beforeEach(function () {
    module = angular.module('dataSet');
  });

  describe('Module', function () {
    it('should be registered', function () {
      expect(!!module).toEqual(true);
    });
  });
});
