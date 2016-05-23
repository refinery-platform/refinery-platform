'use strict';

describe('RefineryDataSetNav.module: unit tests', function () {
  var module;

  beforeEach(function () {
    module = angular.module('refineryDataSetNav');
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

    beforeEach(function () {
      deps = module.value('refineryDataSetNav').requires;
    });

    it('should have "ui-select" as a dependency', function () {
      expect(hasModule('ui.select')).toEqual(true);
    });

    it('should have "ngSanitize" as a dependency', function () {
      expect(hasModule('ngSanitize')).toEqual(true);
    });
  });
});
