'use strict';

describe('DataSetImport.module: unit tests', function () {
  var module;

  beforeEach(function () {
    module = angular.module('refineryDataSetImport');
  });

  describe('Module', function () {
    it('should be registered', function () {
      expect(!!module).toEqual(true);
    });
  });

  describe('Dependencies:', function () {
    var deps;
    var hasModule = function (m) {
      return deps.indexOf(m) >= 0;
    };
    console.log(hasModule);

    beforeEach(function () {
      deps = module.value('refineryDataSetImport').requires;
    });
  });
});
